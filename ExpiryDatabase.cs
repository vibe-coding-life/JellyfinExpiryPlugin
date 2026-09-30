using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace JellyfinExpiry;

public sealed class ExpiryEntry
{
    public long RowId { get; set; }

    // Compatibility with the original expiry worker code.
    public string id => ItemId;

    public string ItemId { get; set; }
    public string FilePath { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}

public class ExpiryDatabase
{
    private readonly string _dbPath;
    private readonly object _sync = new object();

    public ExpiryDatabase()
    {
        // Retain the existing database location and schema.
        string folder = "/var/lib/jellyfin/data/JellyfinExpiry";
        Directory.CreateDirectory(folder);
        _dbPath = Path.Combine(folder, "expiry.db");
        using var connection = Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS expiry_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jellyfin_item_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                added_by_user TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending'
            );
            """;
        command.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath
        }.ToString());
        connection.Open();
        return connection;
    }

    private static ExpiryEntry Read(SqliteDataReader reader) => new ExpiryEntry
    {
        RowId = reader.GetInt64(0),
        ItemId = reader.GetString(1),
        FilePath = reader.GetString(2),
        ExpiresAtUtc = DateTime.Parse(reader.GetString(3), CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal)
    };

    public List<ExpiryEntry> GetPendingItems(bool dueOnly = false)
    {
        lock (_sync)
        {
            using var connection = Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT id, jellyfin_item_id, file_path, expires_at FROM expiry_items
                WHERE status='pending'
                AND ($dueOnly=0 OR julianday(expires_at) <= julianday($now))
                ORDER BY julianday(expires_at), id
                """;
            command.Parameters.AddWithValue("$dueOnly", dueOnly ? 1 : 0);
            command.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
            using var reader = command.ExecuteReader();
            var results = new List<ExpiryEntry>();
            while (reader.Read()) results.Add(Read(reader));
            return results;
        }
    }

    public void Schedule(Guid itemId, string filePath, DateTime expiresAtUtc)
    {
        lock (_sync)
        {
            using var connection = Open();
            using var transaction = connection.BeginTransaction();
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            // New row identity makes a previously fetched due entry obsolete.
            // Match both standard Guid formats, including legacy rows.
            command.CommandText = """
                UPDATE expiry_items SET status='superseded'
                WHERE replace(lower(jellyfin_item_id), '-', '')=$id AND status='pending';
                INSERT INTO expiry_items (jellyfin_item_id, file_path, created_at, expires_at, status)
                VALUES ($id, $path, $created, $expires, 'pending');
                """;
            command.Parameters.AddWithValue("$id", itemId.ToString("N"));
            command.Parameters.AddWithValue("$path", filePath);
            command.Parameters.AddWithValue("$created", DateTime.UtcNow.ToString("O"));
            command.Parameters.AddWithValue("$expires", expiresAtUtc.ToUniversalTime().ToString("O"));
            command.ExecuteNonQuery();
            transaction.Commit();
        }
    }

    public void Cancel(Guid itemId)
    {
        lock (_sync)
        {
            using var connection = Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE expiry_items SET status='cancelled'
                WHERE replace(lower(jellyfin_item_id), '-', '')=$id AND status='pending'
                """;
            command.Parameters.AddWithValue("$id", itemId.ToString("N"));
            command.ExecuteNonQuery();
        }
    }

    public List<ExpiryEntry> GetExpiredItems()
    {
        lock (_sync)
        {
            using var connection = Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT id, jellyfin_item_id, file_path, expires_at FROM expiry_items
                WHERE status='pending'
                AND julianday(expires_at) <= julianday($now)
                ORDER BY julianday(expires_at), id
                """;
            command.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));

            using var reader = command.ExecuteReader();
            var results = new List<ExpiryEntry>();

            while (reader.Read())
            {
                results.Add(Read(reader));
            }

            return results;
        }
    }

    public void MarkDeleted(long rowId)
    {
        lock (_sync)
        {
            using var connection = Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE expiry_items
                SET status='deleted'
                WHERE id=$row
                """;
            command.Parameters.AddWithValue("$row", rowId);
            command.ExecuteNonQuery();
        }
    }

    public void MarkDeleted(string itemId)
    {
        lock (_sync)
        {
            using var connection = Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE expiry_items
                SET status='deleted'
                WHERE jellyfin_item_id=$item
                """;
            command.Parameters.AddWithValue("$item", itemId);
            command.ExecuteNonQuery();
        }
    }


    public void ProcessIfDue(long rowId, Func<ExpiryEntry, bool> process)
    {
        // Scheduling and cancellation wait while this row is being processed.
        // Recheck after acquiring the lock; a fetched entry may have been cancelled.
        lock (_sync)
        {
            using var connection = Open();
            ExpiryEntry entry;
            using (var command = connection.CreateCommand())
            {
                command.CommandText = """
                    SELECT id, jellyfin_item_id, file_path, expires_at FROM expiry_items
                    WHERE id=$row AND status='pending'
                    AND julianday(expires_at) <= julianday($now)
                    """;
                command.Parameters.AddWithValue("$row", rowId);
                command.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
                using var reader = command.ExecuteReader();
                if (!reader.Read()) return;
                entry = Read(reader);
            }

            // Dry runs, skipped entries and failed deletions remain pending.
            if (!process(entry)) return;
            using var complete = connection.CreateCommand();
            complete.CommandText = "UPDATE expiry_items SET status='deleted' WHERE id=$row AND status='pending'";
            complete.Parameters.AddWithValue("$row", rowId);
            complete.ExecuteNonQuery();
        }
    }
}
