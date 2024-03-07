const axios = require("axios");
const dm = require("../configs/domains");
const headersVtex = require("../configs/vtex-headers");

const sendDataToMd = (dataJson, entity) => {
    let configs = {
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/${entity}/documents`,
        headers: headersVtex,
        data: JSON.stringify(dataJson)
    };
    axios(configs).then(resp => {
        if (resp.status == "201") {
            console.log("MD V1 - Dados criados com sucesso!");
            console.log(resp.data);
        } else {
            console.log("MD V1 - Status diferente de 201: ", resp.status);
        }
    }).catch(error => {
        console.log(`Catch in request [${dm.vtex}/${dm.vtexmdapi}/${entity}/documents] by function [sendDataToMd] - See the error below.`);
        console.log(error);
    })
}

module.exports = sendDataToMd;