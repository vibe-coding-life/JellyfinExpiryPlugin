using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace JellyfinExpiry;

[ApiController]
[Route("JellyfinExpiry")]
public class ExpiryWebController : ControllerBase
{
    [HttpGet("WebPlugin.js")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public IActionResult GetWebPlugin()
    {
        var assembly = typeof(ExpiryWebController).Assembly;

        using var stream = assembly.GetManifestResourceStream(
            "JellyfinExpiry.WebPlugin.js");

        if (stream is null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);

        return Content(
            reader.ReadToEnd(),
            "application/javascript; charset=utf-8");
    }
}
