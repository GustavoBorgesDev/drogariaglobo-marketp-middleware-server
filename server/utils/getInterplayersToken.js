const axios = require("axios");
const interpapi = require("../api/interplayers");
const tokenCredentials = require("../configs/token-credentials");
const qs = require("qs");

function getInterplayersToken () {
    let config = {
        method: "post",
        url: 'https://account.iplayers.com.br/interplayersb2c.onmicrosoft.com/B2C_1_Varejo/oauth2/v2.0/token', 
        data: qs.stringify({
            Client_Id: "29254069-7992-4b72-8091-bf2b65ba41e7",
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

module.exports = { getInterplayersToken }