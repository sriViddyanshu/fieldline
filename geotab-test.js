import dotenv from "dotenv";
import GeotabApi from "mg-api-js";

dotenv.config();

const api = new GeotabApi({
    credentials: {
        database: process.env.GEOTAB_DATABASE,
        userName: process.env.GEOTAB_USERNAME,
        password: process.env.GEOTAB_PASSWORD
    },
    path: "my.geotab.com"
});

async function testGeotab() {
    try {
        console.log("Testing Geotab SDK connection...");

        const devices = await api.call("Get", {
            typeName: "Device",
            resultsLimit: 5
        });

        console.log("Connection successful!");
        console.log("Devices retrieved:", devices.length);

        devices.forEach((device, index) => {
            console.log(`${index + 1}. ${device.name}`);
        });

    } catch (error) {
        console.error("Geotab SDK Error:");
        console.error(error);
    }
}

testGeotab();