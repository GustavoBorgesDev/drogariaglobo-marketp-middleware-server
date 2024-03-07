const axios = require("axios");
const dm = require("../configs/domains");
const headersVtex = require("../configs/vtex-headers");

const sendDataToMd = (entity, data) => {
    let config = {
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/${entity}/documents?_schema=dag-body`,
        headers: headersVtex,
        data: JSON.stringify(data)
    };
    axios(config).then(resp => {
        if (resp.status == "201") {
            console.log("MD V2 - Dados Criados com sucesso!");
            console.log(resp.data);
        } else {
            console.log("MD V2 - Status diferente de 201: ", resp.status);
        }
    })
    .catch(error => {
        console.log(`Catch in request [${dm.vtex}/${dm.vtexmdapi}/${entity}/documents?_schema=dag-body] by function [sendDataToMd] - See the error below.`);
        console.log(error);
    })
}

module.exports = sendDataToMd;