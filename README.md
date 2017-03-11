# loopback-connector-kv-extreme-scale

The official WebSphere eXtreme Scale KeyValue connector for LoopBack.

## Usage

While it is possible to use this connector as a standalone module, we
recommended using it in your application via the [LoopBack command-line
tools](https://loopback.io/doc/en/lb3/Command-line-tools.html).

### Installation and configuration

The command line tool will prompt you to install the connector (if not already
installed):

```shell
cd your-loopback-app
lb datasource
? Enter the data-source name: xs
? Select the connector for xs: IBM WebSphere eXtreme Scale key-value connector (supported by StrongLoop)
Connector-specific configuration:
? Connection String url to override other settings (eg: https://user:pass@host:port/wxsdata/v1/grids/$GRID_NAME): https://username:password@localhost:9444/wxsdata/v1/grids/your-grid-name
? Use SSL for connections to the grid: Yes
? Install loopback-connector-kv-extreme-scale@^1.0.0 (Y/n) Yes
extreme-scale-lb3x@1.0.0 $HOME/your-project-name
└── loopback-connector-kv-extreme-scale@1.0.0
```

## Running tests

The test suite requires a running WebSphere eXtreme Scale server. We recommend
Docker for the easiest set up experience.

### Setting up development environment

**Important note for Mac users**

The XSLD image does not work in the virtual environment provided by
Docker for Mac. You need to create a new `docker-machine` using
the `virtualbox` driver, see [docker-machine
docs](https://docs.docker.com/machine/get-started/#/create-a-machine) for
instructions.

**The instructions**

 1. Follow the instructions at https://hub.docker.com/r/ibmcom/xsld/ to setup a
 Docker version of WebSphere eXtreme Scale server.

 2. Create your test grid:

   - Open the administration web interface (`https://your-ip:9443/`), replace
     `your-ip` with the hostname or IP address of your (docker) machine.

     Use `docker-machine ls` to find the IP address used by your docker machine.

   - Login using credentials created in step one, usually `xsadmin` and
    `xsadmin4Me!`
   - Select "Data Grids"
   - Click on the plus-in-circle button in the top-right corner
   - Use `simple` Template, fill in Name `testgrid`

 3. Verify your configuration

  - Open the REST API explorer at `https://your-ip:9444/ibm/api/explorer`
  - Expand `grids` section
  - Expand `POST` endpoint
  - Fill in gridname `testgrid`, mapname `testmap.LUT.O`, key `test`, body
    `{ "name": "test" }`
  - Click "Try it out!"
  - You should receive Response Code `200`

 4. Setup environment variable `EXTREME_SCALE_URL` pointing to the grid created.
    Replace `xsadmin`, `xsadmin4Me!` and `your-ip` with admin username,
    admin password and your hostname/IP address.

    On Linux and Mac:

    ```
    $ export EXTREME_SCALE_URL=https://xsadmin:xsadmin4Me!@your-ip:9444/wxsdata/v1/grids/testgrid/testmap
    ```

    On Windows:

    ```
    % SET EXTREME_SCALE_URL=https://xsadmin:xsadmin4Me!@your-ip:9444/wxsdata/v1/grids/testgrid/testmap
    ```

 5. Congratulations, you can run `npm test` now!

