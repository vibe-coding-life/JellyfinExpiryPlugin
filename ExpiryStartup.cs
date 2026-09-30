using Microsoft.Extensions.DependencyInjection;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Controller;
using Microsoft.Extensions.Hosting;

namespace JellyfinExpiry;

public class ExpiryStartup : IPluginServiceRegistrator
{
    public void RegisterServices(
        IServiceCollection services,
        IServerApplicationHost applicationHost)
    {
        services.AddSingleton<ExpiryDatabase>();
        services.AddHostedService<ExpiryService>();
    }
}
