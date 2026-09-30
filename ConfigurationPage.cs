using MediaBrowser.Model.Plugins;
using MediaBrowser.Common.Plugins;
using System.Collections.Generic;

namespace JellyfinExpiry;

public class ConfigurationPage
{
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "JellyfinExpiry",
            DisplayName = "Jellyfin Expiry",
            EmbeddedResourcePath =
                "JellyfinExpiry.ConfigurationPage.html"
        };
    }
}
