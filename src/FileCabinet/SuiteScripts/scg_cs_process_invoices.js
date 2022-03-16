/** SaaS Consulting Group
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @purpose Alert user when contact record does not exist for customer on SO/quote
 * Version			Date			Author				Remarks
 * 2.00				29 Mar 2021		Seungyeon Shin		Handles client events on the Process Invoices Suitelet
 *
 **/

define([
    "N/ui/dialog",
    "N/search",
    "N/runtime",
    "N/currentRecord",
    "N/url",
    "N/error"
], function (dialog, search, runtime, currentRecord, url, error) {
    /**
     * Updates the sublist filters when Refresh button is clicked
     *
     * @appliedtorecord invoice
     *
     * @returns {Void}
     */
    function scg_invpdf_updateUrlParams() {
        var curRec = currentRecord.get();
        log.debug("curRec", curRec);

        // Initialize variables
        var tranStartDate = curRec.getText("custpage_tran_start_date");
        var tranEndDate = curRec.getText("custpage_tran_end_date");
        var customer = curRec.getValue("custpage_customer");
        var subsidiary = curRec.getValue("custpage_subsidiary");
        var location = curRec.getValue("custpage_location");
        var success = curRec.getValue("custpage_success");
        var status = curRec.getValue("custpage_status");
        var failed = curRec.getValue("custpage_failed");
        var email = curRec.getValue("custpage_email");
        var mail = curRec.getValue("custpage_mail");
        var portal = curRec.getValue("custpage_portal");
        var refresh = "";
        console.log("mail", mail);
        console.log("portal", portal);
        console.log("email", email);

        // Set URL parameter components
        tranStartDate = tranStartDate
            ? "&transtartdate=" + encodeURIComponent(tranStartDate)
            : "";
        tranEndDate = tranEndDate
            ? "&tranenddate=" + encodeURIComponent(tranEndDate)
            : "";
        customer = customer ? "&customer=" + encodeURIComponent(customer) : "";
        subsidiary = subsidiary
            ? "&subsidiary=" + encodeURIComponent(subsidiary)
            : "";
        location = location ? "&location=" + encodeURIComponent(location) : "";
        success = success ? "&success=" + encodeURIComponent(success) : "";
        status = status ? "&status=" + encodeURIComponent(status) : "";
        failed = failed ? "&failed=" + encodeURIComponent(failed) : "";
        email = "&email=" + encodeURIComponent(email);
        mail = "&mail=" + encodeURIComponent(mail);
        portal = "&portal=" + encodeURIComponent(portal);
        refresh = "&refresh=T";

        // Build URL parameter string
        var urlParams =
            tranStartDate +
            tranEndDate +
            customer +
            subsidiary +
            location +
            success +
            status +
            failed +
            email +
            mail +
            portal +
            refresh;
        console.log("urlParams", urlParams);
        var URL = url.resolveScript({
            scriptId: "customscript_scg_sl_process_invoices",
            deploymentId: "customdeploy_scg_sl_process_invoices",
            returnExternalURL: true
        });

        URL += urlParams;

        window.open(URL, "_self", false);
        // curRec.setValue('custpage_url_params', urlParams);
    }

    /**
     * Performs actions when a form is loaded in the user's browser
     *
     * @appliedtorecord invoice
     *
     * @returns {Void}
     */
    function pageInit(context) {
        try {
            var curRec = context.currentRecord;

            document.getElementById("server_commands").addEventListener(
                "load",
                function () {
                    var invCount = 0;
                    var invTotal = 0;
                    var itemCount = curRec.getLineCount("custpage_inv_list");
                    for (var i = 1; itemCount != 0 && i <= itemCount; i++) {
                        invCount++;
                        invTotal += parseFloat(
                            curRec.getSublistValue({
                                sublistId: "custpage_inv_list",
                                fieldId: "custpage_inv_amount",
                                line: i
                            })
                        );
                    }
                    curRec.setValue("custpage_count", invCount);
                    curRec.setValue("custpage_total", invTotal.toFixed(2));
                },
                false
            );
        } catch (e) {
            scg_invpdf_logError(e);
        }
    }

    /**
     * Handles events related to changes to field values
     *
     * @appliedtorecord invoice
     *
     * @returns {Void}
     */
    function fieldChanged(context) {
        try {
            var curRec = context.currentRecord;
            var name = context.fieldId;
            console.log("fieldChanged name", name);

            if (
                name == "custpage_tran_start_date" ||
                name == "custpage_tran_end_date" ||
                name == "custpage_customer" ||
                name == "custpage_subsidiary" ||
                name == "custpage_location" ||
                name == "custpage_success" ||
                name == "custpage_status" ||
                name == "custpage_failed" ||
                name == "custpage_email" ||
                name == "custpage_mail" ||
                name == "custpage_portal"
            ) {
                curRec.setValue("custpage_filter_changed", true);
            }

            if (name == "custpage_inv_process") {
                if (curRec.getValue("custpage_filter_changed") == true) {
                    var currentLine = context.line;
                    console.log("currentLine", currentLine);
                    alert(
                        "Once a filter setting is changed, you must click the Refresh button to update the Invoice list. After the list is refreshed you may select and submit Invoices to be processed."
                    );
                    var processValue = curRec.getSublistValue({
                        sublistId: "custpage_inv_list",
                        fieldId: "custpage_inv_process",
                        line: currentLine
                    });

                    curRec.selectLine({
                        sublistId: "custpage_inv_list",
                        line: currentLine
                    });

                    curRec.setCurrentSublistValue({
                        sublistId: "custpage_inv_list",
                        fieldId: "custpage_inv_process",
                        value: processValue == true ? false : true,
                        ignoreFieldChange: true
                    });
                    curRec.commitLine("custpage_inv_list");

                    var processValue = curRec.getSublistValue({
                        sublistId: "custpage_grouped_inv_list",
                        fieldId: "custpage_inv_process",
                        line: currentLine
                    });

                    curRec.selectLine({
                        sublistId: "custpage_grouped_inv_list",
                        line: currentLine
                    });

                    curRec.setCurrentSublistValue({
                        sublistId: "custpage_grouped_inv_list",
                        fieldId: "custpage_inv_process",
                        value: processValue == true ? false : true,
                        ignoreFieldChange: true
                    });
                    curRec.commitLine("custpage_grouped_inv_list");
                }
            }
        } catch (e) {
            scg_invpdf_logError(e);
            throw e;
        }
    }

    /**
     * Handles events triggered when the user submits the form
     *
     * @appliedtorecord invoice
     *
     * @returns {Boolean} True to continue save, false to abort save
     */
    function saveRecord(context) {
        try {
            var curRec = context.currentRecord;

            var retVal = false;
            retVal =
                curRec.getValue("custpage_filter_changed") == true
                    ? false
                    : true;
            if (!retVal) {
                alert(
                    "Once a filter setting is changed, you must click the Refresh button to update the Invoice list. After the list is refreshed you may select and submit Invoices to be processed."
                );
            }

            if (retVal) {
                var retValTemp =
                    curRec.findSublistLineWithValue({
                        sublistId: "custpage_inv_list",
                        fieldId: "custpage_inv_process",
                        value: "T"
                    }) == -1
                        ? false
                        : true;
                var reValGroupedTemp =
                    curRec.findSublistLineWithValue({
                        sublistId: "custpage_grouped_inv_list",
                        fieldId: "custpage_inv_process",
                        value: "T"
                    }) == -1
                        ? false
                        : true;
                if (!retValTemp && !reValGroupedTemp) {
                    alert(
                        "Please select one or more Invoices to be processed."
                    );
                    retVal = false;
                } else {
                    retVal = true;
                }
            } else {
                retVal = false;
            }

            return retVal;
        } catch (e) {
            scg_invpdf_logError(e);
            throw e;
        }
    }

    /**
     * Logs an exception to the script execution log
     *
     * @appliedtorecord invoice
     *
     * @param {String} e Exception
     * @returns {Void}
     */
    function scg_invpdf_logError(e) {
        // Log the error based on available details
        var errorMessage = error.create({
            name: e.name,
            message: e.message
        });
        log.error("System Error", JSON.stringify(errorMessage));
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        scg_invpdf_updateUrlParams: scg_invpdf_updateUrlParams
    };
});
