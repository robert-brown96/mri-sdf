/**
 * Module Description
 *
 * Version			Date			Author				Remarks
 * 2.00				29 Mar 2021		Seungyeon Shin		Processes a list of invoices for delivery
 *
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope public
 */
define(['N/search', 'N/runtime', 'N/record', 'N/format', 'N/render', 'N/error', 'N/email', 'N/file'],
    function (search, runtime, record, format, render, error, email, file) {
        /**
         * Constants
         */
        var scriptObj = runtime.getCurrentScript();

        const DELIVERY_TYPE_EMAIL = scriptObj.getParameter('custscript_mr_gr_delivery_type_email');// changed by RB
        const DELIVERY_TYPE_MAIL = scriptObj.getParameter('custscript_scg_mr_gr_delivery_type_mail');
        const DELIVERY_TYPE_PORTAL = scriptObj.getParameter('custscript_scg_mr_gr_delivery_type_porta');
        const DELIVERY_FOLDER_MAIL = scriptObj.getParameter('custscript_scg_mr_gr_mail_folder');
        const DELIVERY_FOLDER_PORTAL = scriptObj.getParameter('custscript_scg_mr_gr_portal_folder');

        function getInputData() {
            try {
                log.debug('in getInputData');
            

                //Reference the search containing your data
                var invId = scriptObj.getParameter('custscript_scg_mr_process_gr_inv_ids');
                log.debug('invId', invId);
                invId = (invId) ? JSON.parse(invId) : null;
                
                return invId;
            } 
            catch (error) {
                throw error.message;
            }
        }

        //Basically takes each search result and processes each individually
        function map(context) {
            try { 
                log.debug('in map');

                var mySearch = search.create({
                    type: 'invoicegroup',
                    columns: ['invoicegroupnumber', 'custrecord_invoice_delivery_type', 'custrecord_invoice_email_address_list', 'customer', 'subsidiary'],
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: context.value
                    }]
                });
                log.debug('context.value', context.value);
                log.debug('mySearch', mySearch);

                var invSearch = mySearch.run().getRange(0, 1000);
                log.debug('invSearch', invSearch);

                context.write(context.value, invSearch);
            } 
            catch (error) {
                throw error.message;
            }
        }

        //Begins with your record Internal ID, so you can just load the record and go
        function reduce(context) {
            log.debug('in reduce')
            var scriptObj = runtime.getCurrentScript();
            var emailAuthor = scriptObj.getParameter('custscript_scg_mr_process_gr_inv_author');
            var bccAddress = scriptObj.getParameter('custscript_scg_mr_process_gr_inv_bcc');
            var timestamp = new Date();
            var timestampdt = format.format({value: timestamp, type: 'datetime'});
            var timestampdtz = format.format({value: timestamp, type: 'datetimetz'});

            var invId = context.key;
            invId = parseInt(invId);
            log.debug('invId', invId);

            var searchResult = context.values[0];
            searchResult = JSON.parse(searchResult);
            searchResult = searchResult[0];
            log.debug('searchResult', searchResult);

            var deliveryTypes = searchResult.values['custrecord_invoice_delivery_type'][0].value;
            deliveryTypes = deliveryTypes.split(',');
            var emailAddresses = searchResult.values['custrecord_invoice_email_address_list'];
            var tranId = searchResult.values['invoicegroupnumber'];
            var entityId = searchResult.values['customer'][0].value;
            entityId = parseInt(entityId);
            var subsidiaryId = searchResult.values['subsidiary'][0].value;
            log.debug('deliveryTypes', deliveryTypes);
            log.debug('emailAddresses', emailAddresses);
            log.debug('tranId', tranId);
            log.debug('entityId', entityId);
            log.debug('subsidiaryId', subsidiaryId);
            var fileId = null;
          
          // RB TESTING 1026
           
          
          
          
/*
            // Generate the PDF file
            var invoiceSearchObj = search.create({
                type: "invoice",
                filters:
                [
                  ["type","anyof","CustInvc"], 
                  "AND", 
                  ["mainline","is","F"], 
                  "AND", 
                  ["taxline","is","F"]
               ],
               columns:
               [
                  search.createColumn({name: "item", label: "Item"}),
                  search.createColumn({name: "fxrate", label: "Item Rate"}),
                  search.createColumn({name: "fxgrossamount", label: "Gross Amount (Foreign Currency)"}),
                  search.createColumn({
                     name: "type",
                     join: "item",
                     label: "Type"
                  }),
                  search.createColumn({name: "linesequencenumber", label: "Line Sequence Number"})
               ]
            });
            var groupFilter = search.createFilter({
                name: 'groupedto',
                operator: search.Operator.IS,
                values: invId
            });

            invoiceSearchObj.filters.push(groupFilter);


            var jsonObj = [];

            var invItemType = null;
            var invItem = null;
            var invRate = null;
            var invAmt = null;
            var invLineNum = null;
            log.debug('invoiceSearchObj.run', invoiceSearchObj.run().getRange(0, 1000));
            var invoiceResults = invoiceSearchObj.run().getRange(0, 1000);
            invoiceResults.forEach(function(result){
                invItemType = result.getValue({
                     name: "type",
                     join: "item",
                });
                invItem = result.getText('item');
                invRate = result.getValue('fxrate');
                invAmt = result.getValue('fxgrossamount');
                invLineNum = result.getValue('linesequencenumber');
                jsonObj.push({itemtype: invItemType, item: invItem, fxrate: invRate, fxgrossamount: invAmt, linesequencenumber: invLineNum});
            });

            log.debug('jsonObj', jsonObj);
*/
          //  var xmlTmplFile = file.load('SuiteScripts/custtmpl_109_t2318187_797 (1).xml');//changed RB 10/26
            var myFile = render.create();

           /* myFile.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "groupedinvoices_summary",
                data: {invoices: jsonObj}
            });*/

           // myFile.templateContent = xmlTmplFile.getContents();
            myFile.addRecord('record', record.load({
                type: 'invoicegroup',
                id: invId
            }));
          	myFile.setTemplateById(109)
            var pdfFile = myFile.renderAsPdf();
            // var pdfFile = render.transaction({
            //     entityId: invId,
            //     printMode: 'PDF'
            // });
            var tempTranId = tranId.replace('#', '');
            pdfFile.name = 'Invoice_' + tempTranId + '.pdf'
            log.debug('pdfFile', pdfFile);
          log.debug('deliveryTypes', deliveryTypes);

            // Deliver by email
            if (deliveryTypes.indexOf(DELIVERY_TYPE_EMAIL) >= 0) {
              log.debug('Delivering via email')
                // Validate email addresses
                if (!emailAddresses || emailAddresses.length == 0) {
                    throw error.create({
                        name: 'INVOICE_EMAIL-NO_ADDRESSES',
                        message: 'There are no email addresses associated with this Invoice. [Invoice: ' + tranId + ']',
                        notifyOff: false
                    });
                }

                // Create the email record
                // var templateId = search.lookupFields({
                //     type: 'subsidiary',
                //     id: subsidiaryId,
                //     columns: ['custrecord_invoice_email_template']
                // });
                // templateId = templateId.custrecord_invoice_email_template[0].value;
                // log.debug('templateId', templateId);

                // if (!templateId){
                //     throw error.create({
                //         name: 'INVOICE_EMAIL-NO_TEMPLATE',
                //         message: 'There is no email template associated with the Subsidiary (' + subsidiaryId + ') on the Invoice record [Invoice: ' + tranId + ']',
                //         notifyOff: false
                //     });
                // }
                var emailMerger = render.mergeEmail({
                    templateId: 640,
                    entity: {
                        type: 'customer',
                        id: entityId
                    },
                    recipient: null,
                    supportCaseId: null,
                    transactionId: null,
                    customRecord:null
                });
                log.debug('emailMerger', emailMerger);

                // Send the email
                email.send({
                    author: emailAuthor, 
                    recipients: emailAddresses, 
                    subject: emailMerger.subject + ' ',
                    body: emailMerger.body,
                    bcc: bccAddress,
                    relatedRecords: {
                        entityId: entityId,
                        customRecord: {
                            id: invId,
                            recordType: 'invoicegroup'
                        }
                    }, 
                    attachments: [pdfFile]
                });
            }

            // Deliver by mail
            if (deliveryTypes.indexOf(DELIVERY_TYPE_MAIL) >= 0) {
                pdfFile.folder = DELIVERY_FOLDER_MAIL;
                var fileId = pdfFile.save();
            }

            // Deliver by portal
            if (deliveryTypes.indexOf(DELIVERY_TYPE_PORTAL) >= 0) {
                pdfFile.folder = DELIVERY_FOLDER_PORTAL;
                pdfFile.save();
                if (!fileId) {
                    var fileId = pdfFile.save();
                }
            }

            // Update the Invoice recordsa
            var myRec = record.load({
                type: 'invoicegroup',
                id: invId
            });
            log.debug('myRec', myRec);
            // record.submitFields({
            //     type: 'invoicegroup',
            //     id: invId,
            //     values: {
            //         custrecord_invoice_delivery_date: timestampdtz,
            //         custrecord_invoice_delivery_error: ''
            //     }
            // });
            myRec.setValue('custrecord_invoice_delivery_date', timestamp);
            myRec.setValue('custrecord_invoice_delivery_error', '');
            myRec.save();
            log.debug('field submitted');

        }

        //Don't Edit; this will give you useful error messages for each record processed
        function summarize(summary) {
            log.debug('in summarize');

            handleErrors(summary);
            handleSummaryOutput(summary.output);

            // *********** HELPER FUNCTIONS ***********

            function handleErrors(summary) {
                var errorsArray = getErrorsArray(summary);
                if (!errorsArray || !errorsArray.length) {
                    log.debug('No errors encountered');
                    return;
                }

                for (var i in errorsArray) {
                    log.error('Error ' + i, errorsArray[i]);
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
                        log.audit('Input Error', summary.inputSummary.error);
                        errorsArray.push('Input Error | MSG: ' + summary.inputSummary.error);
                    }
                    summary.mapSummary.errors.iterator().each(
                        function (key, e) {
                            var errorString = getErrorString(e);
                            log.audit('Map Error', 'KEY: ' + key + ' | ERROR: ' + errorString);
                            errorsArray.push('Map Error | KEY: ' + key + ' | ERROR: ' + errorString);
                            return true; // Must return true to keep
                            // looping
                        });

                    summary.reduceSummary.errors.iterator().each(
                        function (key, e) {
                            var errorString = getErrorString(e);
                            log.audit('Reduce Error', 'KEY: ' + key + ' | MSG: ' + errorString);
                            errorsArray.push('Reduce Error | KEY: ' + key + ' | MSG: ' + errorString);


                            //                      UpdateStatus(key, 3, errorString);

                            return true; // Must return true to keep
                            // looping
                        });

                    return errorsArray;

                    // *********** HELPER FUNCTIONS ***********
                    function getErrorString(e) {
                        var errorString = '';
                        var errorObj = JSON.parse(e);
                        if (errorObj.type == 'error.SuiteScriptError' || errorObj.type == 'error.UserEventError') {
                            errorString = errorObj.name + ': ' + errorObj.message;
                        } else {
                            errorString = e;
                        }
                        return errorString;
                    }
                }
            }

            function handleSummaryOutput(output) {
                var contents = '';
                output.iterator().each(function (key, value) {
                    contents += (key + ' ' + value + '\n');
                    return true;
                });
                if (contents) {
                    log.debug('output', contents);
                }
            }

        }

        function isNullorEmpty(checkVal) {
            if (checkVal != null && checkVal != undefined && checkVal != '') {
                return false;
            } else {
                return true;
            }
        };

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    }
);