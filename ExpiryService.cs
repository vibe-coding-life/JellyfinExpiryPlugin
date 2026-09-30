using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Entities;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace JellyfinExpiry;

public class ExpiryService : BackgroundService
{
    private readonly ILogger<ExpiryService> _logger;
    private readonly ExpiryDatabase _database;
    private readonly ILibraryManager _libraryManager;

    public ExpiryService(
        ILogger<ExpiryService> logger,
        ExpiryDatabase database,
        ILibraryManager libraryManager)
    {
        _logger = logger;
        _database = database;
        _libraryManager = libraryManager;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Jellyfin Expiry service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                ProcessExpiry();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Expiry processing failed");
            }

            try
            {
                await Task.Delay(
                    TimeSpan.FromMinutes(5),
                    stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private void ProcessExpiry()
    {
        var plugin = Plugin.Instance;

        if (plugin == null)
        {
            return;
        }

        if (!plugin.Configuration.Enabled)
        {
            return;
        }

        var expired = _database.GetExpiredItems();

        foreach (var item in expired)
        {
            try
            {
                _database.ProcessIfDue(
                    item.RowId,
                    ProcessExpiredItem);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed processing expiry row {RowId} for item {ItemId}",
                    item.RowId,
                    item.ItemId);
            }
        }
    }

    private bool ProcessExpiredItem(ExpiryEntry item)
    {
        var plugin = Plugin.Instance;

        if (plugin == null ||
            !plugin.Configuration.Enabled)
        {
            return false;
        }

        var config = plugin.Configuration;

        if (!Guid.TryParse(
                item.ItemId,
                out var itemGuid))
        {
            _logger.LogWarning(
                "Invalid Jellyfin item id {ItemId}; completing invalid expiry entry",
                item.ItemId);

            return true;
        }

        var jellyfinItem =
            _libraryManager.GetItemById(itemGuid);

        if (jellyfinItem == null)
        {
            _logger.LogWarning(
                "Jellyfin item {ItemId} no longer exists; completing expiry entry",
                item.ItemId);

            return true;
        }

        if (config.DryRun)
        {
            _logger.LogInformation(
                "DRY RUN: would remove movie {Name} ({ItemId}); delete files: {DeleteFiles}",
                jellyfinItem.Name,
                item.ItemId,
                config.DeleteFiles);

            // Keep it pending so it can be processed later
            // after Dry Run is disabled.
            return false;
        }

        _libraryManager.DeleteItem(
            jellyfinItem,
            new DeleteOptions
            {
                DeleteFileLocation =
                    config.DeleteFiles
            });

        _logger.LogInformation(
            "Expired movie removed: {Name} ({ItemId}); delete files: {DeleteFiles}",
            jellyfinItem.Name,
            item.ItemId,
            config.DeleteFiles);

        return true;
    }
}
