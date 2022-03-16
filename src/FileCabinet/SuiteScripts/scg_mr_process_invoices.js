/**
 * Module Description
 *
 * Version			Date			Author				Remarks
 * 2.00				29 Mar 2021		Seungyeon Shin		Processes a list of invoices for delivery
 * 2.1              26 October 2021  Bobby Brown        Added mail invoice consolidation
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope public
 */
define([
    "N/search",
    "N/runtime",
    "N/record",
    "N/format",
    "N/render",
    "N/error",
    "N/email",
    "N/file",
    "N/xml"
], function (
    search,
    runtime,
    record,
    format,
    render,
    error,
    email,
    file,
    xmlMod
) {
    /**
     * Constants
     */
    var scriptObj = runtime.getCurrentScript();

    const DELIVERY_TYPE_EMAIL = scriptObj.getParameter(
        "custscript_scg_mr_delivery_type_email"
    );
    const DELIVERY_TYPE_MAIL = scriptObj.getParameter(
        "custscript_scg_mr_delivery_type_mail"
    );
    const DELIVERY_TYPE_PORTAL = scriptObj.getParameter(
        "custscript_scg_mr_delivery_type_portal"
    );
    const DELIVERY_FOLDER_MAIL = scriptObj.getParameter(
        "custscript_scg_mr_mail_folder"
    );
    const DELIVERY_FOLDER_PORTAL = scriptObj.getParameter(
        "custscript_scg_mr_portal_folder"
    );
    const DELIVERY_FOLDER_CONSOL_MAIL = 14937; // mri customization

    function getInputData() {
        try {
            log.debug("in getInputData");

            //Reference the search containing your data
            var invId = scriptObj.getParameter(
                "custscript_scg_mr_process_inv_ids"
            );
            log.debug("invId", invId);
            invId = invId ? JSON.parse(invId) : null;

            return invId;
        } catch (error) {
            throw error.message;
        }
    }

    //Basically takes each search result and processes each individually
    function map(context) {
        try {
            log.debug("in map");

            var mySearch = search.create({
                type: search.Type.INVOICE,
                columns: [
                    "tranid",
                    "custbody_invoice_delivery_type",
                    "custbody_invoice_email_address_list",
                    "entity",
                    "subsidiary",
                    "location",
                    { join: "location", name: "custrecord_scg_loc_emp" },
                    { join: "location", name: "custrecord_scg_loc_bulk_cc" }
                ],
                filters: [
                    {
                        name: "internalid",
                        operator: "is",
                        values: context.value
                    },
                    {
                        name: "mainline",
                        operator: "is",
                        values: true
                    }
                ]
            });
            log.debug("context.value", context.value);
            log.debug("mySearch", mySearch);

            var invSearch = mySearch.run().getRange(0, 1000);
            log.debug("invSearch", invSearch);

            context.write(context.value, invSearch);
        } catch (error) {
            throw error.message;
        }
    }

    //Begins with your record Internal ID, so you can just load the record and go
    function reduce(context) {
        try {
            log.debug("in reduce");
            var scriptObj = runtime.getCurrentScript();

            var bccAddress = scriptObj.getParameter(
                "custscript_scg_mr_process_inv_bcc"
            );
            var timestamp = new Date();
            var timestampdt = format.format({
                value: timestamp,
                type: "datetime"
            });
            var timestampdtz = format.format({
                value: timestamp,
                type: "datetimetz"
            });

            var invId = context.key;
            invId = parseInt(invId);
            log.debug("invId", invId);

            var searchResult = context.values[0];
            searchResult = JSON.parse(searchResult);
            searchResult = searchResult[0];
            log.debug("searchResult", searchResult);
            var locArEmp = searchResult.values[
                "location.custrecord_scg_loc_emp"
            ][0]
                ? searchResult.values["location.custrecord_scg_loc_emp"][0]
                      .value
                : "";
            var emailAuthor =
                locArEmp ||
                scriptObj.getParameter("custscript_scg_mr_process_inv_author");

            // MRI customization for cc'ing employees from location record
            var ccEmp = [];
            if (
                searchResult.values["location.custrecord_scg_loc_bulk_cc"]
                    .length > 0
            ) {
                for (
                    var i = 0;
                    i <
                    searchResult.values["location.custrecord_scg_loc_bulk_cc"]
                        .length;
                    i++
                ) {
                    ccEmp.push(
                        searchResult.values[
                            "location.custrecord_scg_loc_bulk_cc"
                        ][i].value
                    );
                }
            }

            // var ccEmp = searchResult.values[
            //     "location.custrecord_scg_loc_bulk_cc"
            // ][0]
            //     ? searchResult.values["location.custrecord_scg_loc_bulk_cc"][0]
            //           .value
            //     : "";
            log.debug({ title: "ccemp", details: ccEmp });
            var deliveryTypes =
                searchResult.values["custbody_invoice_delivery_type"][0].value;
            deliveryTypes = deliveryTypes.split(",");
            var emailAddresses =
                searchResult.values["custbody_invoice_email_address_list"];
            var tranId = searchResult.values["tranid"];
            var entityId = searchResult.values["entity"][0].value;
            entityId = parseInt(entityId);
            var subsidiaryId = searchResult.values["subsidiary"][0].value;
            log.debug("deliveryTypes", deliveryTypes);
            log.debug("emailAddresses", emailAddresses);
            log.debug("tranId", tranId);
            log.debug("entityId", entityId);
            log.debug("subsidiaryId", subsidiaryId);
            var fileId = null;

            // Generate the PDF file
            var pdfFile = render.transaction({
                entityId: invId,
                printMode: "PDF"
            });
            log.debug("pdfFile", pdfFile);

            // Deliver by email
            if (deliveryTypes.indexOf(DELIVERY_TYPE_EMAIL) >= 0) {
                // Validate email addresses
                if (!emailAddresses || emailAddresses.length == 0) {
                    throw error.create({
                        name: "INVOICE_EMAIL-NO_ADDRESSES",
                        message:
                            "There are no email addresses associated with this Invoice. [Invoice: " +
                            tranId +
                            "]",
                        notifyOff: false
                    });
                }

                // Create the email record
                var templateId = search.lookupFields({
                    type: "subsidiary",
                    id: subsidiaryId,
                    columns: ["custrecord_invoice_email_template"]
                });
                templateId =
                    templateId.custrecord_invoice_email_template[0].value;
                log.debug("templateId", templateId);

                if (!templateId) {
                    throw error.create({
                        name: "INVOICE_EMAIL-NO_TEMPLATE",
                        message:
                            "There is no email template associated with the Subsidiary (" +
                            subsidiaryId +
                            ") on the Invoice record [Invoice: " +
                            tranId +
                            "]",
                        notifyOff: false
                    });
                }
                var emailMerger = render.mergeEmail({
                    templateId: templateId,
                    entity: {
                        type: "customer",
                        id: entityId
                    },
                    recipient: null,
                    supportCaseId: null,
                    transactionId: invId,
                    customRecord: null
                });
                log.debug("emailMerger", emailMerger);
                var csvFileId = search.lookupFields({
                    type: search.Type.INVOICE,
                    id: invId,
                    columns: ["custbody_scg_usage_file_attach"]
                });
                csvFileId = csvFileId.custbody_scg_usage_file_attach;

                // send without additional attachment
                if (!csvFileId) {
                    // Send the email
                    email.send({
                        author: emailAuthor,
                        recipients: emailAddresses,
                        subject: emailMerger.subject + " ",
                        body: emailMerger.body,
                        bcc: bccAddress,
                        cc: ccEmp,
                        relatedRecords: {
                            entityId: entityId,
                            transactionId: invId
                        },
                        attachments: [pdfFile]
                    });
                } else {
                    var csvFile = file.load({
                        id: csvFileId
                    });
                    // Send the email
                    email.send({
                        author: emailAuthor,
                        recipients: emailAddresses,
                        subject: emailMerger.subject + " ",
                        body: emailMerger.body,
                        bcc: bccAddress,
                        cc: ccEmp,
                        relatedRecords: {
                            entityId: entityId,
                            transactionId: invId
                        },
                        attachments: [pdfFile, csvFile]
                    });
                }
            }

            // Deliver by mail
            var mailPdfId;
            if (deliveryTypes.indexOf(DELIVERY_TYPE_MAIL) >= 0) {
                pdfFile.folder = DELIVERY_FOLDER_MAIL;
                pdfFile.isOnline = true;
                var fileId = pdfFile.save();
                log.debug("Mail file id: " + fileId);
                //mailPdfs.push(fileId);
                //log.debug('PDF Array: '+mailPdfs);
                mailPdfId = fileId;
                record.attach({
                    record: {
                        type: "file",
                        id: fileId
                    },
                    to: {
                        type: "invoice",
                        id: invId
                    }
                });
            }

            // Deliver by portal
            if (deliveryTypes.indexOf(DELIVERY_TYPE_PORTAL) >= 0) {
                pdfFile.folder = DELIVERY_FOLDER_PORTAL;
                pdfFile.save();
                if (!fileId) {
                    var fileId = pdfFile.save();
                    record.attach({
                        record: {
                            type: "file",
                            id: fileId
                        },
                        to: {
                            type: "invoice",
                            id: invId
                        }
                    });
                }
            }

            // Update the Invoice records
            record.submitFields({
                type: "invoice",
                id: invId,
                values: {
                    custbody_invoice_delivery_date: timestampdtz,
                    custbody_invoice_delivery_error: ""
                }
            });
            log.debug("field submitted");

            if (deliveryTypes.indexOf(DELIVERY_TYPE_MAIL) >= 0) {
                log.debug({
                    title: "Write context for reduce",
                    details: mailPdfId
                });
                context.write({
                    key: "MAIL",
                    value: mailPdfId
                });
            }
        } catch (error) {
            // Update the Invoice records
            record.submitFields({
                type: "invoice",
                id: invId,
                values: {
                    custbody_invoice_delivery_error: error.message
                }
            });
            throw error.message;
        }
    }

    //Don't Edit; this will give you useful error messages for each record processed
    function summarize(summary) {
        log.debug("in summarize");

        var mailPdfs = [];
        summary.output.iterator().each(function (key, value) {
            if (key === "MAIL") mailPdfs.push(value);
            return true;
        });
        log.debug({
            title: "Mail PDFs",
            details: mailPdfs
        });

        if (mailPdfs.length > 0) {
            createPDFArray(mailPdfs);
        }

        handleErrors(summary);
        handleSummaryOutput(summary.output);

        // *********** HELPER FUNCTIONS ***********

        function handleErrors(summary) {
            var errorsArray = getErrorsArray(summary);
            if (!errorsArray || !errorsArray.length) {
                log.debug("No errors encountered");
                return;
            }

            for (var i in errorsArray) {
                log.error("Error " + i, errorsArray[i]);
            }

            if (errorsArray && errorsArray.length) {
                //
                // INSERT YOUR CODE HERE
                //
            }

            return errorsArray;

            // *********** HELPER FUNCTIONS ***********
            function getErrorsArray(summary) {
                var errorsArray = [];

                if (summary.inputSummary.error) {
                    log.audit("Input Error", summary.inputSummary.error);
                    errorsArray.push(
                        "Input Error | MSG: " + summary.inputSummary.error
                    );
                }
                summary.mapSummary.errors.iterator().each(function (key, e) {
                    var errorString = getErrorString(e);
                    log.audit(
                        "Map Error",
                        "KEY: " + key + " | ERROR: " + errorString
                    );
                    errorsArray.push(
                        "Map Error | KEY: " + key + " | ERROR: " + errorString
                    );
                    return true; // Must return true to keep
                    // looping
                });

                summary.reduceSummary.errors.iterator().each(function (key, e) {
                    var errorString = getErrorString(e);
                    log.audit(
                        "Reduce Error",
                        "KEY: " + key + " | MSG: " + errorString
                    );
                    errorsArray.push(
                        "Reduce Error | KEY: " + key + " | MSG: " + errorString
                    );

                    //                      UpdateStatus(key, 3, errorString);

                    return true; // Must return true to keep
                    // looping
                });

                return errorsArray;

                // *********** HELPER FUNCTIONS ***********
                function getErrorString(e) {
                    var errorString = "";
                    var errorObj = JSON.parse(e);
                    if (
                        errorObj.type == "error.SuiteScriptError" ||
                        errorObj.type == "error.UserEventError"
                    ) {
                        errorString = errorObj.name + ": " + errorObj.message;
                    } else {
                        errorString = e;
                    }
                    return errorString;
                }
            }
        }

        function handleSummaryOutput(output) {
            var contents = "";
            output.iterator().each(function (key, value) {
                contents += key + " " + value + "\n";
                return true;
            });
            if (contents) {
                log.debug("output", contents);
            }
        }
    }

    function isNullorEmpty(checkVal) {
        if (checkVal != null && checkVal != undefined && checkVal != "") {
            return false;
        } else {
            return true;
        }
    }
    /////////////////// MRI PDF CONSOLIDATION FUNCTIONS //////////////////////////////////
    /**
     *
     * @param pdfArray {[Number]}
     */
    function createPDFArray(pdfArray) {
        try {
            var xml =
                '<?xml version="1.0"?>\n<!DOCTYPE pdf.html PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n';

            //    xml += "<pdfset>";

            var toWrite = [
                '<?xml version="1.0"?>\n<!DOCTYPE pdf.html PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">',
                "<pdfset>"
            ];

            const arrayLength = pdfArray.length;
            log.debug({
                title: "Mail INvoice count",
                details: arrayLength
            });

            //loop through array and add to xml set
            for (var i = 0; i < arrayLength; i++) {
                var fileId = pdfArray[i];
                var fileUrl = file.load({
                    id: fileId
                });

                var pdf_fileURL = xmlMod.escape({
                    xmlText: fileUrl.url
                });

                toWrite.push("<pdf src='" + pdf_fileURL + "'/>");

                //xml += "<pdf.html src='"+ pdf_fileURL +"'/>\n";
            }
            toWrite.push("</pdfset>");

            xml += "</pdfset>";

            log.debug({
                title: "bound template",
                details: xmlMod.escape({ xmlText: toWrite.join("\n") })
            });
            var consolidatePDF = render.xmlToPdf({
                xmlString: toWrite.join("\n")
            });
            const newFileName =
                "MailInvRun " + new Date().toISOString() + ".pdf.html";
            consolidatePDF.folder = DELIVERY_FOLDER_CONSOL_MAIL;
            consolidatePDF.name = newFileName;
            const consolFileID = consolidatePDF.save();
            log.debug({
                title: "SAVED CONSOLIDATED FILE",
                details: consolFileID
            });
        } catch (e) {
            log.error({
                title: "ERROR CONSOLIDATING PDF",
                details: e
            });
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
