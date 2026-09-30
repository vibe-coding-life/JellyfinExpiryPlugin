using MediaBrowser.Model.Plugins;

namespace JellyfinExpiry;

public class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = false;
    public bool DryRun { get; set; } = true;
    public int DefaultExpiryDays { get; set; } = 7;
    public bool DeleteFiles { get; set; } = false;
}
