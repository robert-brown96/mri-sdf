/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "N/ui/serverWidget", "N/runtime"], (
    record,
    search,
    serverWidget,
    runtime
) => {
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} context.form - Current form
     * @param {ServletRequest} context.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = context => {
        try {
            log.debug("BF", context.type);
            if (
                (context.type === "print" &&
                    context.newRecord.type === "invoice") ||
                (context.type === "edit" &&
                    runtime.executionContext === runtime.ContextType.MAP_REDUCE)
            ) {
                const balance = getTotalBalance(context);

                let custField = context.form.addField({
                    id: "custpage_total_balance",
                    label: "Total Balance",
                    type: serverWidget.FieldType.CURRENCY
                });
                custField.defaultValue = balance;
            }
        } catch (e) {
            log.error({
                title: "ERROR IN BEFORE LOAD",
                details: e
            });
        }
    };

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     *
     * @description On creation of an invoice the multi select field is set by the value in checkboxes
     * On edit of an invoice, the email address list is set to the value on the billing address if the email is empty or billing address has changed
     */
    const beforeSubmit = context => {
        try {
            const doNotDeliver = context.newRecord.getValue({
                fieldId: "custbody_scg_dont_deliver"
            });

            if (
                context.type === context.UserEventType.EDIT &&
                context.newRecord.type === record.Type.INVOICE &&
                !doNotDeliver
            ) {
                //   convertMultiSelect(context);
                const invoiceEmails = context.newRecord.getValue({
                    fieldId: "custbody_invoice_email_address_list"
                });
                const oldInvoiceEmails = context.oldRecord.getValue({
                    fieldId: "custbody_invoice_email_address_list"
                });
                const billAdd = context.newRecord
                    .getSubrecord({
                        fieldId: "billingaddress"
                    })
                    .getValue({
                        fieldId: "id"
                    });
                const oldBillAdd = context.oldRecord
                    .getSubrecord({
                        fieldId: "billingaddress"
                    })
                    .getValue({
                        fieldId: "id"
                    });
                const delMethodOld = context.oldRecord.getValue({
                    fieldId: "custbody_invoice_delivery_type"
                });
                const delMethodNew = context.newRecord.getValue({
                    fieldId: "custbody_invoice_delivery_type"
                });
                log.debug({
                    title: "UPDATE EMAILS2",
                    details: billAdd + "  " + oldBillAdd
                });
                // if (invoiceEmails !== oldInvoiceEmails) return;
                if (
                    delMethodNew.length !== delMethodOld.length &&
                    !delMethodNew.includes("1")
                )
                    return;
                if (billAdd !== oldBillAdd || isEmpty(invoiceEmails)) {
                    log.debug({
                        title: "UPDATE EMAILS",
                        details: context
                    });
                    let newEmailList = getAddressEmails(context);
                    const inv = context.newRecord;
                    if (!isEmpty(newEmailList)) {
                        log.debug("setting emails");

                        inv.setValue({
                            fieldId: "custbody_invoice_email_address_list",
                            value: newEmailList
                        });

                        inv.setValue({
                            fieldId: "custbody_invoice_delivery_type",
                            value: ["1"]
                        });
                    } else if (inv.getValue({ fieldId: "subsidiary" }) === 2) {
                        inv.setValue({
                            fieldId: "custbody_invoice_delivery_type",
                            value: ["2"]
                        });
                    }
                }
            }
        } catch (e) {
            log.error({
                title: "ERROR IN BEFORE SUBMIT",
                details: e
            });
        }
    };

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     *
     * @description On creation of any transaction type the region is set based on billing country
     * If invoice, external id is set to document number and email list is set to the emails from the bill to address
     *
     */
    const afterSubmit = context => {
        try {
            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            )
                return;
            if (context.newRecord.type === record.Type.INVOICE) {
                if (context.type === context.UserEventType.CREATE) {
                    let valObj = {};
                    valObj.cseg1 = setTransRegion(context);
                    /*valObj.externalid = context.newRecord.getValue({
                        fieldId: "tranid"
                    });*/
                    //for Jan interim period only
                    //unmarks grouping checkbox
                    const markedForGrouping = context.newRecord.getValue({
                        fieldId: "forinvoicegrouping"
                    });
                    if (markedForGrouping) valObj.forinvoicegrouping = false;

                    let emailList = getAddressEmails(context);
                    let doNotDeliver = context.newRecord.getValue({
                        fieldId: "custbody_scg_dont_deliver"
                    });
                    let existingTypes = context.newRecord.getValue({
                        fieldId: "custbody_invoice_delivery_type"
                    });
                    if (doNotDeliver) {
                        valObj.custbody_invoice_email_address_list = "";
                        valObj.custbody_invoice_delivery_type = [];
                    } else if (existingTypes.length > 0) {
                        log.debug({
                            title: "Pre set delivery",
                            details: existingTypes
                        });
                        if (isEmpty(emailList)) {
                            valObj.custbody_invoice_email_address_list =
                                emailList;
                        }
                    } else {
                        if (isEmpty(emailList)) {
                            valObj.custbody_invoice_email_address_list =
                                emailList;
                            valObj.custbody_invoice_delivery_type = ["1"];
                        } else if (
                            context.newRecord.getValue({
                                fieldId: "subsidiary"
                            }) === 2 &&
                            context.newRecord.getValue({
                                fieldId: "custbody_invoice_delivery_type"
                            }) === ""
                        ) {
                            valObj.custbody_invoice_delivery_type = ["2"];
                        }

                        let cusFields = search.lookupFields({
                            type: search.Type.CUSTOMER,
                            id: context.newRecord.getValue({
                                fieldId: "entity"
                            }),
                            columns: ["custentity_scg_inv_del_type"]
                        });
                        if (cusFields.custentity_scg_inv_del_type.length > 0)
                            valObj.custbody_invoice_delivery_type =
                                cusFields.custentity_scg_inv_del_type;
                    }
                    log.debug({
                        title: "OBJ",
                        details: valObj
                    });
                    record.submitFields({
                        type: "invoice",
                        id: context.newRecord.id,
                        values: valObj
                    });
                }
            } else {
                if (context.type !== context.UserEventType.CREATE) return;
                let region = setTransRegion(context);

                if (region)
                    record.submitFields({
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                        values: {
                            cseg1: region
                        }
                    });
            }
        } catch (e) {
            log.error("ERROR IN AFTER SUBMIT", e);
        }
    };

    /**
     *
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
    const convertMultiSelect = context => {
        try {
            const newRec = context.newRecord;

            const emailBox = newRec.getValue("custbody_scg_email_delivery");
            const mailBox = newRec.getValue("custbody_scg_mail_delivery");
            const portalBox = newRec.getValue("custbody_scg_portal_delivery");
            let values = [];
            if (emailBox) values.push("1");
            if (mailBox) values.push("2");
            if (portalBox) values.push("3");

            if (values.length === 0) {
                const sub = newRec.getValue("subsidiary");
                if (sub == 2) values.push("2");
            }
            newRec.setValue({
                fieldId: "custbody_invoice_delivery_type",
                value: values
            });
        } catch (e) {
            log.error({
                title: "ERROR IN SETTING MULTISELECT",
                details: e
            });
        }
    };

    /**
     *
     * @param context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     *
     * @returns {string} email address list
     */
    const getAddressEmails = context => {
        try {
            const billAddRec = context.newRecord.getSubrecord({
                fieldId: "billingaddress"
            });
            if (!billAddRec) return;

            let email = billAddRec.getValue({
                fieldId: "custrecord_scg_address_email"
            });
            let additionalEmail = billAddRec.getValue({
                fieldId: "custrecord_scg_a_email_list"
            });

            let emails;
            if (additionalEmail !== "" && additionalEmail !== "undefined") {
                emails = email + "," + additionalEmail;
            } else {
                emails = email;
            }
            log.debug({
                title: "Emails:",
                details: emails
            });
            return emails;
        } catch (e) {
            log.error({
                title: "Error setting emails",
                details: e
            });
        }
    };

    /**
     *
     * @param context
     * @param {Record} context.newRecord
     * @param {string} context.type
     *
     */
    const getTotalBalance = context => {
        try {
            log.debug({
                title: "TOTAL BALANCE C ",
                details: context
            });
            let inv = context.newRecord;
            const invId = inv.id;

            const cusId = inv.getValue({
                fieldId: "entity"
            });
            const currencyId = inv.getValue({
                fieldId: "currency"
            });
            let agingSearch = search.load({
                id: "customsearch_scg_total_balance"
            });
            agingSearch.filters.push(
                search.createFilter({
                    name: "currency",
                    operator: search.Operator.ANYOF,
                    values: [currencyId]
                })
            );
            agingSearch.filters.push(
                search.createFilter({
                    name: "internalid",
                    join: "customer",
                    operator: search.Operator.IS,
                    values: [cusId]
                })
            );
            const resultSet = agingSearch.run().getRange(0, 1000);
            /* log.debug({
                title: "Results: ",
                details: resultSet
            });*/
            let totalBalance = 0;
            resultSet.forEach(result => {
                /*log.debug({
                    title: "Balance",
                    details: result.getValue({
                        name: "fxamountremaining",
                        summary: "SUM"
                    })
                });*/
                totalBalance =
                    totalBalance +
                    Number(
                        result.getValue({
                            name: "formulanumeric",
                            summary: "sum"
                        })
                    );
            });
            log.debug({
                title: "TOTAL BALNCE",
                details: totalBalance
            });
            return totalBalance;
        } catch (e) {
            log.error({
                title: "ERROR GETTING TOTAL BALANCE",
                details: e
            });
        }
    };

    /**
     *
     * @param context
     * @returns {Number || null} segment value
     */
    const setTransRegion = context => {
        if (context.type !== context.UserEventType.CREATE) return;
        let rec = context.newRecord;
        let retVal;
        const recId = rec.id;
        const recType = rec.type;

        log.debug("Record Type = " + recType, "Record Id = " + recId);

        var transFields = search.lookupFields({
            type: recType,
            id: recId,
            columns: ["billcountry"]
        });
        log.debug("Transaction Fields", transFields);

        let billCountry = "";
        if (!isEmpty(transFields.billcountry)) {
            billCountry = transFields.billcountry[0].value;
        } else {
            return;
        }
        log.debug("Bill Country", billCountry);

        const americas = [
            "AG",
            "AI",
            "AN",
            "AQ",
            "AR",
            "AW",
            "BB",
            "BL",
            "BM",
            "BO",
            "BR",
            "BS",
            "BZ",
            "CA",
            "CL",
            "CO",
            "CR",
            "CU",
            "DM",
            "DO",
            "EC",
            "FK",
            "GD",
            "GF",
            "GL",
            "GP",
            "GT",
            "GY",
            "HN",
            "HT",
            "IO",
            "JM",
            "KN",
            "KY",
            "LC",
            "MF",
            "MQ",
            "MS",
            "MX",
            "NC",
            "NI",
            "PA",
            "PE",
            "PM",
            "PR",
            "PY",
            "SR",
            "SV",
            "TC",
            "TF",
            "TT",
            "US",
            "UY",
            "VC",
            "VE"
        ];
        const apac = [
            "AF",
            "AM",
            "AS",
            "AU",
            "AZ",
            "BD",
            "BN",
            "BT",
            "CC",
            "CK",
            "CN",
            "CX",
            "FJ",
            "FM",
            "GU",
            "HK",
            "ID",
            "IN",
            "JP",
            "KH",
            "KI",
            "KP",
            "KR",
            "KZ",
            "LA",
            "LK",
            "MH",
            "ML",
            "MM",
            "MN",
            "MO",
            "MP",
            "MV",
            "MY",
            "NF",
            "NP",
            "NR",
            "NU",
            "NZ",
            "PF",
            "PG",
            "PH",
            "PK",
            "PN",
            "PW",
            "RU",
            "SB",
            "SC",
            "SG",
            "TH",
            "TJ",
            "TK",
            "TM",
            "TO",
            "TP",
            "TV",
            "TW",
            "UZ",
            "VG",
            "VI",
            "VN",
            "VU",
            "WF",
            "WS"
        ];
        const emea = [
            "AD",
            "AE",
            "AL",
            "AO",
            "AT",
            "AX",
            "BA",
            "BE",
            "BF",
            "BG",
            "BH",
            "BI",
            "BJ",
            "BV",
            "BW",
            "BY",
            "CD",
            "CF",
            "CG",
            "CH",
            "CI",
            "CM",
            "CS",
            "CV",
            "CY",
            "CZ",
            "DE",
            "DJ",
            "DK",
            "DZ",
            "EA",
            "EE",
            "EG",
            "EH",
            "ER",
            "ES",
            "ET",
            "FI",
            "FO",
            "FR",
            "GA",
            "GB",
            "GE",
            "GG",
            "GH",
            "GI",
            "GM",
            "GN",
            "GQ",
            "GR",
            "GS",
            "GW",
            "HM",
            "HR",
            "HU",
            "IC",
            "IE",
            "IL",
            "IM",
            "IQ",
            "IR",
            "IS",
            "IT",
            "JE",
            "JO",
            "KE",
            "KG",
            "KM",
            "KW",
            "LB",
            "LI",
            "LR",
            "LS",
            "LT",
            "LU",
            "LV",
            "LY",
            "MA",
            "MC",
            "MD",
            "ME",
            "MG",
            "MK",
            "MR",
            "MT",
            "MU",
            "MW",
            "MZ",
            "NA",
            "NE",
            "NG",
            "NL",
            "NO",
            "OM",
            "PL",
            "PS",
            "PT",
            "QA",
            "RE",
            "RO",
            "RS",
            "RW",
            "SA",
            "SD",
            "SE",
            "SH",
            "SI",
            "SJ",
            "SK",
            "SL",
            "SM",
            "SN",
            "SO",
            "ST",
            "SY",
            "SZ",
            "TD",
            "TG",
            "TN",
            "TR",
            "TZ",
            "UA",
            "UG",
            "UM",
            "VA",
            "YE",
            "YT",
            "ZA",
            "ZM",
            "ZW"
        ];

        if (americas.includes(billCountry)) {
            log.debug("Country Found in Americas", "Set Region to AMERICAS");

            retVal = 2;
        } else if (apac.includes(billCountry)) {
            log.debug("Country Found in APAC", "Set Region to APAC");

            retVal = 1;
        } else if (emea.includes(billCountry)) {
            log.debug("Country Found in EMEA", "Set Region to EMEA");

            retVal = 3;
        }
        return retVal;
    };

    function isEmpty(stValue) {
        if (stValue == "" || stValue == null || stValue == undefined) {
            return true;
        }

        return false;
    }

    return { beforeLoad, beforeSubmit, afterSubmit };
});
