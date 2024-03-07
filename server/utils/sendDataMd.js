const axios = require("axios");
const dm = require("../configs/domains");
const headersVtex = require("../configs/vtex-headers");

function sendDataMd (dataJson, entity) {
    let config = {
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/${entity}/documents`,
        headers: headersVtex,
        data: JSON.stringify(dataJson)
    };
    return axios(config);
}

module.exports = { sendDataMd }