/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version  Date            Author           Remark
 * 1.00     20 Nov 2020     Doug Humberd     Handles User Events on Invoice Records
 *                          Doug Humberd     Sets the External ID = Tranid when Invoice Saved
 * 2.0  30 March 2021         Bobby Brown     Added after submit logic for customer total balance
 *
 * 3.0  23 Nov 2021   Bobby Brown             Consolidating transaction UEs
 */
define(["N/record", "N/runtime", "N/search", "N/format"], /**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */ function (record, runtime, search, format) {
    /**
     * Function definition to be triggered before record is submitted.
     * If type is create or edit - the line period is set for each line by concatening rev dates
     * If type is create - convert multi select field from checkboxes
     * If type is edit - Check if billing emails should be updated
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(context) {
        try {
            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            )
                return;
            mri_inv_set_period(context);
            if (
                context.type === context.UserEventType.CREATE &&
                context.newRecord.type === record.Type.INVOICE
            )
                convertMultiSelect(context);

            if (
                context.type === context.UserEventType.EDIT &&
                context.newRecord.type === record.Type.INVOICE
            ) {
                const invoiceEmails = context.newRecord.getValue({
                    fieldId: "custbody_invoice_email_address_list"
                });
                const oldInvoiceEmails = context.oldRecord.getValue({
                    fieldId: "custbody_invoice_email_address_list"
                });
                const billAdd = context.newRecord.getSubrecord({
                    fieldId: "billingaddress"
                });
                const oldBillAdd = context.oldRecord.getSubrecord({
                    fieldId: "billingaddress"
                });
                const delMethodOld = context.oldRecord.getValue({
                    fieldId: "custbody_invoice_delivery_type"
                });
                const delMethodNew = context.newRecord.getValue({
                    fieldId: "custbody_invoice_delivery_type"
                });
                if (delMethodNew !== delMethodOld) return;
                if (isEmpty(invoiceEmails) || billAdd !== oldBillAdd) {
                    setEmails(context);
                }
            }
        } catch (e) {
            log.error({
                title: "ERROR IN BEFORE SUBMIT",
                details: e
            });
        }
    }

    /**
     * Function definition to be triggered before record is loaded.
     * If type is create or edit - External ID = Document Number
     * Set total balance for customer in currency of transaction
     * set transaction region
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
    const afterSubmit = async context => {
        try {
            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            )
                return;
            if (context.newRecord.type === record.Type.INVOICE) {
                mri_inv_setExternalId(context);
                getTotalBalance(context);

                if (context.type === context.UserEventType.CREATE)
                    setEmails(context);

                //for Jan interim period only
                //unmarks grouping checkbox
                const markedForGrouping = context.newRecord.getValue({
                    fieldId: "forinvoicegrouping"
                });
                if (
                    markedForGrouping &&
                    context.type === context.UserEventType.CREATE
                ) {
                    record.submitFields({
                        type: "invoice",
                        id: context.newRecord.id,
                        values: { forinvoicegrouping: false }
                    });
                }
            }
            setTransRegion(context);
        } catch (e) {
            log.error("ERROR IN AFTER SUBMIT", e);
        }
    };

    function mri_inv_setExternalId(context) {
        //Run on Create - edited to only create on 11/23
        if (context.type != "create" && context.type != "edit") {
            return;
        }

        const invRec = context.newRecord;
        const invId = invRec.id;

        var tranid = invRec.getValue({
            fieldId: "tranid"
        });

        log.debug("setExternalId", "Tranid = " + tranid);

        record.submitFields({
            type: "invoice",
            id: invId,
            values: {
                externalid: tranid
            }
        });
    }

    /**
     *
     * @param context
     * @param {Record} context.newRecord
     * @param {string} context.type
     *
     */
    function getTotalBalance(context) {
        //create and edit only
        if (context.type != "print" && context.type != "edit") {
            return;
        }

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

        let cusFilter = search.createFilter({
            name: "internalid",
            join: "customer",
            operator: search.Operator.IS,
            values: [cusId]
        });
        agingSearch.filters.push(
            search.createFilter({
                name: "currency",
                operator: search.Operator.ANYOF,
                values: [currencyId]
            })
        );
        agingSearch.filters.push(cusFilter);
        const resultSet = agingSearch.run().getRange(0, 1000);
        log.debug({
            title: "Results: ",
            details: resultSet
        });
        let totalBalance = 0;
        resultSet.forEach(result => {
            log.debug({
                title: "Balance",
                details: result.getValue({
                    name: "amountremaining",
                    summary: "SUM"
                })
            });
            totalBalance =
                totalBalance +
                Number(
                    result.getValue({ name: "amountremaining", summary: "SUM" })
                );
        });

        record.submitFields({
            type: "invoice",
            id: invId,
            values: {
                custbodymri_total_c_balance: totalBalance
            }
        });
    }

    const setTransRegion = context => {
        if (context.type !== context.UserEventType.CREATE) return;
        let rec = context.newRecord;

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
            record.submitFields({
                type: recType,
                id: recId,
                values: {
                    cseg1: "2"
                }
            });
        } else if (apac.includes(billCountry)) {
            log.debug("Country Found in APAC", "Set Region to APAC");
            record.submitFields({
                type: recType,
                id: recId,
                values: {
                    cseg1: "1"
                }
            });
        } else if (emea.includes(billCountry)) {
            log.debug("Country Found in EMEA", "Set Region to EMEA");
            record.submitFields({
                type: recType,
                id: recId,
                values: {
                    cseg1: "3"
                }
            });
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
     */
    const setEmails = context => {
        try {
            const billAddRec = context.newRecord.getSubrecord({
                fieldId: "billingaddress"
            });
            const inv = context.newRecord;

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
            if (!isEmpty(emails)) {
                log.debug("setting emails");

                inv.setValue({
                    fieldId: "custbody_invoice_email_address_list",
                    value: emails
                });

                inv.setValue({
                    fieldId: "custbody_invoice_delivery_type",
                    value: ["1"]
                });
            } else {
                inv.setValue({
                    fieldId: "custbody_invoice_delivery_type",
                    value: ["2"]
                });
            }
        } catch (e) {
            log.error({
                title: "Error setting emails",
                details: e
            });
        }
    };

    function mri_inv_set_period(context) {
        let tranRec = context.newRecord;

        //  log.debug({
        //    title:'New Record',
        //  details:tranRec
        //});

        const lineCount = tranRec.getLineCount({
            sublistId: "item"
        });

        for (let i = 0; i < lineCount; i++) {
            var revStart = tranRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_rev_rec_start_date",
                line: i
            });

            var revEnd = tranRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_rev_rec_end_date",
                line: i
            });
            if (isEmpty(revEnd) == false && isEmpty(revStart) == false) {
                revStart = format.format({
                    value: revStart,
                    type: format.Type.DATE
                });
                revEnd = format.format({
                    value: revEnd,
                    type: format.Type.DATE
                });

                const period = revStart + " - " + revEnd;

                tranRec.setSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_scg_app_period",
                    line: i,
                    value: period
                });
            }
        }
    }

    function isEmpty(stValue) {
        if (stValue == "" || stValue == null || stValue == undefined) {
            return true;
        }

        return false;
    }

    return {
        //beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});

/**
 * Logs an exception to the script execution log
 *
 * @appliedtorecord customer
 *
 * @param {String} e Exception
 * @returns {Void}
 */
function mri_inv_logError(e) {
    // Log the error based on available details
    if (e instanceof nlobjError) {
        log.error("System Error", e.getCode() + "\n" + e.getDetails());
        //alert(e.getCode() + '\n' + e.getDetails());
    } else {
        log.error("Unexpected Error", e.toString());
        //alert(e.toString());
    }
}
