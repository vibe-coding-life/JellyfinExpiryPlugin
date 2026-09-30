namespace JellyfinExpiry;

public class ExpirySettings
{
    public bool Enabled { get; set; } = true;

    // Safety switch - keep true while testing
    public bool DryRun { get; set; } = true;

    // How often the expiry worker checks
    public int CheckIntervalMinutes { get; set; } = 5;
}
