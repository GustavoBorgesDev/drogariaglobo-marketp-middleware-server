const express = require("express");
const router = express.Router();
const axios = require("axios");
const dm = require("../configs/domains");
const headersVtex = require("../configs/vtex-headers");
const prodCredentials = require("../configs/production-credentials");
const utilDate = require("../utils/getFormatedDateInISO");
const utilToken = require("../utils/getInterplayersToken");
const cron = require('node-cron');

let moment = require("moment");
let mmtz = require('moment-timezone');
moment.locale("pt-br");
mmtz.tz('America/Sao_Paulo');

// Utils
const utilMd = require("../utils/sendDataMd");

// '40 6 * * *' significa às 6:40 da manhã
cron.schedule('05 21 * * *', () => {
    runOrders();
});

const runOrders = async () => {
    console.log("\n\n\n----- [controller.orders.js] ----- \n");
    console.log("----- INICIANDO MIDDLWARE ORDERS ----- \n\n");
    console.log("[1] - Buscando dados do Master Data V2\n");

    let respEffected = await getEffectedList();
    if (respEffected.status != 200) {
        return;
    }

    console.log("[1. 1] - Dados recuperados.\n");

    let listEffected = respEffected.data;
    let listToConfirmed = [];

    console.log("[2] - Filtrando pedidos NÃO confirmados...\n");
    for (let i = 0; i < listEffected.length; i++) {
        if (listEffected[i].confirmation == "false") {
            let respParsed = JSON.parse(listEffected[i].respeffective);
            let resumeListProducts = [];
            respParsed.product.forEach(item => {
                resumeListProducts.push({
                    id: item.id,
                    EAN: item.ean
                });
            });
            let orderData = {
                mdId: listEffected[i].id,
                orderId: listEffected[i].orderid,
                nsu: respParsed.transaction.transactionCode,
                holderId: respParsed.consumer.holderId || "",
                cardId: respParsed.consumer.cardId || "",
                products: resumeListProducts
            }
            listToConfirmed.push(orderData);
        } 
    }

    console.log("[2.1] - Filtragem completa.\n");
    console.log("[2.2] = Total NÃO confirmados: ", listToConfirmed.length);

    let listOrders = [];
    console.log("\n[3] - Buscando os pedidos faturados na VTEX...\n");
    for (let i = 0; i < listToConfirmed.length; i++) {
        let orderId = listToConfirmed[i].orderId;
        try {
            let respOrder = await getOrder(orderId);
            if (respOrder.data.status == "invoiced") {
                let pacData = respOrder.data.packageAttachment;
                if (!pacData.packages || !pacData.packages[0]) {
                    console.log(`[P - ${i}] - Id: ${orderId} - Sem Nº e chave da NF.\n`);
                    return;
                }
                let orderPaymentInfo = {
                    nfNumber: pacData.packages[0].invoiceNumber,
                    nfKey: pacData.packages[0].invoiceKey
                }
                let dataOrder = { ...listToConfirmed[i], ...orderPaymentInfo };
                console.log(`[P - ${i}] - Pedido ${orderId}\n`);
                listOrders.push(dataOrder);
            }
        } catch (e) {
            console.log("Erro no pedido: ", orderId);
            if (e && e.response) {
                console.log("Erro de request\n");
            } else {
                console.log("Erro de código: ", e.message);
                console.log("\n");
            }
        }
    }

    console.log("[3.1] - Pedidos buscados.\n");
    console.log(`[3.2] - Total pedidos faturados organizados: ${listOrders.length}\n`);
    
    // Caso não tenha nenhum pedido aguardando confirmação
    if (listOrders.length == 0) {
        console.log("\nNenhum pedido esperando confirmação.\n");
        return;
    }

    console.log("[4] - Gerando um token...\n");
    const respToken = await utilToken.getInterplayersToken();
    if (respToken.status != 200) {
        return; 
    }

    console.log("[4.1] - Token gerado.\n");
    const TOKEN = respToken.data.access_token;

    console.log("[5] - Fazendo a confirmação na Interplayers...\n");
    let listConfirmed = [];
    for (let i = 0; i < listOrders.length; i++) {
        let orderId = listOrders[i].orderId;
        try {

            let respConfirmation = await sendConfirmation(listOrders[i], TOKEN);
            if (respConfirmation.status == 200) {

                // Sucesso na confirmação
                if (respConfirmation.data.returnCode == "N000" || respConfirmation.data.returnCode == "W003") {
                    let dataJson = {
                        mdId: listOrders[i].mdId,
                        confirmation: "true"
                    }
                    let respUpdateConfirmation = await updateConfirmation(dataJson);
                    listConfirmed.push({
                        orderId: orderId
                    });
                    let dataConfirm = {
                        orderid: orderId,
                        message: respConfirmation.data.informativeText,
                        returncode: respConfirmation.data.returnCode
                    }
                    await sendLogConfirmation(dataConfirm);
                    console.log(`[P - ${i}] - Pedido ${orderId} confirmado e atualizado.`);
                    console.log(`[P - ${i}] Status: ${respUpdateConfirmation.status}\n`)
                } 
                // Log se o resultado for diferente
                else {
                    let dataJson = {
                        orderid: orderId,
                        message: respConfirmation.data.informativeText,
                        returncode: respConfirmation.data.returnCode
                    }
                    await sendLogConfirmation(dataJson);
                }
            }
        }
        catch(e) {
            console.log(e);
        }
    }

    console.log("[5.1] - Confirmação feita!\n");

    let dataMessage = {};
    if (req.body && req.body.message) {
        dataMessage.message = `${req.body.message} - Total: ${listConfirmed.length}`;
    } else {
        dataMessage.message = `Mid. (v2) [Orders] executado! Total pedidos confirmados: ${listConfirmed.length}`;
    }

    dataMessage.date = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss");

    console.log("[4] - Salvando log da execução!\n");

    let dataStatus = {
        mensagem: dataMessage.message,
        data: "200"
    }

    let respMd = await utilMd.sendDataMd(dataStatus, "SP");
    if (respMd.status == "201") {
        console.log("[4.1] - Log salvo!\n");
    } 

    console.log("[END] - Middleware - Interplayers encerrado.\n");
}

router.post("/middleware/v2/run-middleware-orders", async (req, res) => {
    try {
        res.json({
            message: "Sucesso Orders"
        });
    }
    catch (e) {
        res.json({
            message: "Erro."
        });
    }
});

const getEffectedList = async () => {
    let config = {
        method: "get",
        url: `${dm.vtex}/${dm.vtexmdapi}/midefetiva/search?_fields=_all&_sort=createdIn DESC`,
        headers: headersVtex
    }
    return axios(config);
}

const getOrder = async (id) => {
    let config = {
        method: "get",
        url: `https://drogariaglobo.myvtex.com/api/oms/pvt/orders/${id}`,
        headers: headersVtex
    }
    return axios(config);
}

const sendConfirmation = async (dataPayment, token) => {
    let bodyRequest = {
        control: {
            clientId: prodCredentials.clientId,
            username: prodCredentials.username,
            tableId: "00000000-0000-0000-0000-000000000000",
            localNumber: 1,
            localHour: utilDate.getFormatedDateInISO(),
            industryId: "999",
            stationId: "",
            companyCode: prodCredentials.companyCode,
            attendanceHash: dataPayment.nfKey,
            OperationId: dataPayment.nfNumber,
            taxCouponType: "NCF",
            acessKey: "",
            terminalId: "ECOMMERCE",
            softwareId: ""
        },
        consumer: {
            holderId: dataPayment.holderId || "",
            cardId: dataPayment.cardId || ""
        },
        transaction: {
            transactionCode: dataPayment.nsu,
            providerCode: ""
        },
        product: dataPayment.products
    }

    let config = {
        method: 'post',
        url: 'https://apivarejo.interplayers.com.br/attendance/transaction/confirma',
        headers: {
            'Version': '1',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: bodyRequest
    };
    return axios(config);
}

const updateConfirmation = async (bodyRequest) => {
    let config = {
        method: "patch",
        url: `${dm.vtex}/${dm.vtexmdapi}/midefetiva/documents/${bodyRequest.mdId}`,
        headers: headersVtex,
        data: JSON.stringify({
            confirmation: bodyRequest.confirmation
        })
    }
    return axios(config);
}

const sendLogConfirmation = async (bodyRequest) => {
    let config = {
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/midlogconfirma/documents?_schema=dag-body`,
        headers: headersVtex,
        data: JSON.stringify(bodyRequest)
    };
    return axios(config);
}

const sendHelloMD = async (dataJson) => {
    let configs = {
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/midhello/documents?_schema=dag-body`,
        headers: headersVtex,
        data: JSON.stringify(dataJson)
    };

    return axios(configs);
}

module.exports = router;