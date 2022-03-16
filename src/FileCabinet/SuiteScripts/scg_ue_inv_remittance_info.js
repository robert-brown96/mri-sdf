/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version  Date            Author           Remark
 * 2.00     23 Mar 2021     Seungyeon Shin
 *
 */
define(["N/record", "N/runtime", "N/search", "N/email", "N/render"], /**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */ function (record, runtime, search, email, render) {
    function afterSubmit(context) {
        try {
            //Run on Edit
            if (context.type == "edit" || context.type == "create") {
                var invRec = context.newRecord;
                var invRecId = invRec.id;

                var invSub = invRec.getValue("subsidiary");
                log.debug("invSub", invSub);

                var invCurr = invRec.getValue("currency");
                log.debug("invCurr", invCurr);

                var invLoc = invRec.getValue("location");
                log.debug("invLoc", invLoc);

                var mySearch = search.load({
                    id: "customsearch_scg_remittance_info_search"
                });

                var subFilter = search.createFilter({
                    name: "custrecord_subsidiary_2",
                    operator: search.Operator.IS,
                    values: [invSub]
                });

                var currFilter = search.createFilter({
                    name: "custrecord_currency",
                    operator: search.Operator.IS,
                    values: [invCurr]
                });

                var locFilter = search.createFilter({
                    name: "custrecord_scg_ri_location",
                    operator: search.Operator.IS,
                    values: [invLoc]
                });

                mySearch.filters.push(subFilter);
                mySearch.filters.push(currFilter);
                mySearch.filters.push(locFilter);

                var myResults = mySearch.run().getRange(0, 1000);
                log.debug("myResults", myResults);
                var remitRec;
                if (myResults[0]) {
                    remitRec = myResults[0].getValue("internalid");
                    log.debug("remitRec", remitRec);
                }

                if (!remitRec) {
                    log.debug("USING DEFAULT", invSub);
                    switch (invSub) {
                        case "2": //us
                            remitRec = 1;
                            break;
                        case "3": //canada
                            remitRec = 28;
                            break;
                        case "4": //uk
                            remitRec = 30;
                            break;
                        case "5": //ireland
                            remitRec = 52;
                            break;
                        case "6": //south africa
                            remitRec = 53;
                            break;
                        case "17": //UAE
                            remitRec = 55;
                            break;
                        case "7": // australia
                            remitRec = 56;
                            break;
                        case "8": // singapore
                            remitRec = 64;
                            break;
                        case "11": // japan
                            remitRec = 72;
                            break;
                        case "9": // new zealand
                            remitRec = 66;
                            break;
                        case "10": // hong kong
                            remitRec = 69;
                            break;
                        default:
                            log.error({
                                title: "CANNOT FIND DEFAULT REMITTANCE",
                                details: subFilter
                            });
                            break;
                    }
                }

                record.submitFields({
                    type: "invoice",
                    id: invRecId,
                    values: {
                        custbody_remittance_information: remitRec
                    }
                });
            }
        } catch (e) {
            // Log the error based on available details
            if (e instanceof nlobjError) {
                log.error("System Error", e.getCode() + "\n" + e.getDetails());
                //alert(e.getCode() + '\n' + e.getDetails());
            } else {
                log.error("Unexpected Error", e.toString());
                //alert(e.toString());
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
