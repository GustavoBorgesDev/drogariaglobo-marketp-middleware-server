const axios = require("axios");
const qs = require("qs");

function getDermaclubToken () {
    let config = {
        method: "post",
        url: "https://interplayersdevb2c.b2clogin.com/interplayersdevb2c.onmicrosoft.com/B2C_1_Varejo_PRE/oauth2/v2.0/token", 
        data: qs.stringify({
            Client_Id: "de1e455d-c41c-db74-a8e8-0f74f9b20017",
            Client_Secret: "X1Z8Q~u6LLoB5eY8NXbY_tPJ8F-bM~45NvnSObkW",
            Grant_Type: "client_credentials",
            scope: "https://interplayersb2c.onmicrosoft.com/services/varejo-api/.default",
        }),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }
    return axios(config);
}

module.exports = { getDermaclubToken }