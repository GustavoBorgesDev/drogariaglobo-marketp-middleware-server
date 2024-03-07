const axios = require("axios");
const dm = require("../configs/domains");
const headersVtex = require("../configs/vtex-headers");

const sendDataToMd = (data) => {
    axios({
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/loadtables/documents?_schema=dag-body`,
        headers: headersVtex,
        data: JSON.stringify(data)
    })
    .then(resp => {
        if (resp.status == '201') {
            console.log('MD V2 - Dados Criados com sucesso!');
            console.log(resp.data);
        } else {
            console.log("MD V2 - Status diferente de 201: ", resp.status);
        }
    })
    .catch(error => {
        console.log(`Catch in request [${dm.vtex}/${dm.vtexmdapi}/loadtables/documents?_schema=dag-body] by function [sendDataToMd] - See the error below.`);
        console.log('Master Data V2 - Error status: ', error.response.status);
        console.log('Master Data V2 - Error data: ');
        console.log(error.response.data);
        console.log(error.response.data.errors);
        console.log(error.response.data.errors[0]);
        console.log("\n\n");
    })
}

module.exports = sendDataToMd;