using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Serialization;

namespace JellyfinExpiry;

[ApiController]
[Route("JellyfinExpiry")]
[Authorize(Policy = "RequiresElevation")]
public class ExpiryController : ControllerBase
{
    private readonly ExpiryDatabase _database;
    private readonly ILibraryManager _libraryManager;

    public ExpiryController(ExpiryDatabase database, ILibraryManager libraryManager)
    {
        _database = database;
        _libraryManager = libraryManager;
    }

    [HttpGet("Schedules")]
    public ActionResult<List<ExpiryScheduleDto>> GetSchedules()
    {
        var results = new List<ExpiryScheduleDto>();
        foreach (var entry in _database.GetPendingItems())
        {
            var item = Guid.TryParse(entry.ItemId, out var id)
                ? _libraryManager.GetItemById(id) : null;
            results.Add(new ExpiryScheduleDto
            {
                ItemId = entry.ItemId,
                Name = item?.Name ?? "Movie no longer in library",
                ExpiresAtUtc = entry.ExpiresAtUtc,
                IsDue = entry.ExpiresAtUtc <= DateTime.UtcNow
            });
        }
        return Ok(results);
    }

    [HttpPost("Movies/{itemId:guid}/Schedule")]
    public ActionResult<ExpiryScheduleDto> Schedule(Guid itemId, [FromBody] ExpiryScheduleRequest request)
    {
        var plugin = Plugin.Instance;
        if (plugin == null) return StatusCode(503, "Expiry plugin is not ready.");
        int days = request.Days ?? plugin.Configuration.DefaultExpiryDays;
        if (days < 1) return BadRequest("Expiry must be a positive whole number of days.");
        DateTime expires;
        try { expires = DateTime.UtcNow.AddDays(days); }
        catch (ArgumentOutOfRangeException) { return BadRequest("The expiry period is too large."); }

        var item = _libraryManager.GetItemById(itemId);
        if (item == null) return NotFound("Movie was not found.");
        if (item is not Movie) return BadRequest("Only movies can be scheduled.");
        if (string.IsNullOrWhiteSpace(item.Path) || !Path.IsPathRooted(item.Path))
            return BadRequest("This movie does not have an absolute local file path.");

        _database.Schedule(itemId, item.Path, expires);
        return Ok(new ExpiryScheduleDto
        {
            ItemId = itemId.ToString("N"), Name = item.Name, ExpiresAtUtc = expires, IsDue = false
        });
    }

    [HttpDelete("Movies/{itemId:guid}/Schedule")]
    public IActionResult Cancel(Guid itemId)
    {
        _database.Cancel(itemId);
        return NoContent();
    }
}

public sealed class ExpiryScheduleRequest
{
    [JsonPropertyName("Days")]
    public int? Days { get; set; }
}

public sealed class ExpiryScheduleDto
{
    [JsonPropertyName("ItemId")]
    public string ItemId { get; set; }
    [JsonPropertyName("Name")]
    public string Name { get; set; }
    [JsonPropertyName("ExpiresAtUtc")]
    public DateTime ExpiresAtUtc { get; set; }
    [JsonPropertyName("IsDue")]
    public bool IsDue { get; set; }
}
