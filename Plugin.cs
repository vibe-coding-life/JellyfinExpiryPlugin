using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using System;
using System.Collections.Generic;

namespace JellyfinExpiry;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static Plugin Instance { get; private set; }

    public override string Name => "Jellyfin Expiry";
    public override Guid Id => Guid.Parse("7e2d9c5e-4a7f-4c18-9f1d-9f5b5d9b4a11");
    public override string Description => "Automatically remove temporary media after expiry.";

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = "JellyfinExpiry",
            DisplayName = "Jellyfin Expiry",
            EmbeddedResourcePath = "JellyfinExpiry.ConfigurationPage.html",
            EnableInMainMenu = false
        };
    }

    public override void UpdateConfiguration(BasePluginConfiguration configuration)
    {
        if (configuration is not PluginConfiguration settings)
        {
            throw new ArgumentException("Invalid Jellyfin Expiry configuration.", nameof(configuration));
        }

        if (settings.DefaultExpiryDays < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(configuration), "Expiry must be at least one day.");
        }

        base.UpdateConfiguration(configuration);
    }
}
