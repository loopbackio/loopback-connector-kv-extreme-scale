# loopback-connector-kv-extreme-scale

The official WebSphere eXtreme Scale KeyValue connector for LoopBack.

## Setting up development environment

The test suite requires an instance of WebSphere eXtreme Scale server.
Docker is the easiest way for setting it up.

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

