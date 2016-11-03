import 'script!systemjs/dist/system';
import 'whatwg-fetch';

interface AppShellAPIBootConfig {
  user: {
    id: string;
    name: string;
    surname: string;
  }
  apps: {
    [name: string]: {
      publicPath: string;
      main: string;
    }
  }
}

interface AppShellAPI {
  bootConfig: AppShellAPIBootConfig;
  appMountPoint: string;
}

//noinspection JSUnusedGlobalSymbols
export class AppShell {

    private currentLoadedApp: string;
    private currentLoadedAppUnmount: Function;

    private shellAPI: AppShellAPI;

    // noinspection JSUnusedGlobalSymbols
    constructor(
      private bootConfigEntryPoint: string,
      private mountPoint: string
    ) {}

    boot() {

        return AppShell.loadBootConfig( this.bootConfigEntryPoint )
          .then(( bootConfig: AppShellAPIBootConfig ) => {

              this.shellAPI = {
                  bootConfig: bootConfig,
                  appMountPoint: this.mountPoint
              };

              this.registerApplicationsPath();

          });

    }

    /**
     * Load boot config data from shell backend
     * @param entryPoint
     * @return Promise<AppShellAPIBootConfig>
     */
    static loadBootConfig( entryPoint: string ): Promise<AppShellAPIBootConfig> {

        return fetch( entryPoint, { headers: { 'Accept': 'application/json' } } )
          .then(( response ) => { return response.json() });

    }

    /**
     * Load app
     * @param appKey
     * @returns {Promise}
     */
    loadApp( appKey: string ): void | Promise<Function> {

        const appConfig = this.shellAPI.bootConfig.apps[ appKey ];

        // Validate App definition
        if ( this.shellAPI.bootConfig.apps[ appKey ] === undefined ) {

            throw new Error( `App ${ appKey } is not defined!` );

        }

        if ( this.currentLoadedApp === appKey ) {

            console.info( `App ${ appKey } already loaded` );

            return;

        }

        // Unload current app
        if ( this.currentLoadedApp !== undefined ) {

            this.currentLoadedAppUnmount();

        }

        return SystemJS.import( `${appConfig.publicPath}${appConfig.main}` )
          .then(( app: any ) => {

              if ( typeof app.main !== 'function' ) {

                  throw new Error( `Unable to find 'main' function` );

              }

              this.currentLoadedAppUnmount = app.main( this.shellAPI, () => console.log( `App '${ appKey }' loaded` ) );

              this.currentLoadedApp = appKey;

              return this.currentLoadedAppUnmount;

          });

    }

    /**
     * Register public path of all defined applications
     */
    private registerApplicationsPath() {

        window.__AppShell_publicPath__ = Object.keys( this.shellAPI.bootConfig.apps ).reduce((
          previous: {[appName: string]: string},
          appName: string
        ) => {

            previous[ appName ] = this.shellAPI.bootConfig.apps[ appName ].publicPath;

            return previous;

        }, {});

    }
}
