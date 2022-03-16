/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version  Date            Author           Remark
 * 1.00     3/3/21     Bobby Brown     Checks if associated Invoice is Paid In Full.  If yes, pass paid through date to SO
 * 1.1     3/4/21       Bobby           Add logic to set date to today if the context is create
 * 1.2 5/4/21           Bobby           Adjust for new invoicing scenarios with no Sales Order
 */


define(['N/record','N/runtime','N/search','N/format'],
    function (record,runtime,search,format){

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {string} context.type - Trigger type
         * @param {Form} context.form - Current form
         */
        function beforeLoad(context) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         */
        function beforeSubmit(context) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         */
        function afterSubmit(context) {

            try{
                //only run on create or edit
                if (context.type == 'create' || context.type == 'edit'){

                    checkPaidStatus(context);

                }

            }catch(e){
                mri_logError(e);
            }

        }//end after submit


        /**
         *
         * @param {object} context
         * @param {Record} context.newRecord - New Record
         */
        function checkPaidStatus(context){

            var tran = context.newRecord;
            var tranId = tran.id;
            var tranType = tran.type;

            log.debug({
                title: 'Start',
                details: 'Transaction: '+ tranId + ' ' + tranType
            });

            //get count of apply lines
            var applyCount = tran.getLineCount({
                sublistId: 'apply'
            });
            var createdDate;
            if (context.type == 'create'){
                //get today
                var today = new Date();
                today = format.parse({
                    value:today,
                    type: format.Type.DATE
                });
                createdDate = today;

            }else {
                createdDate = tran.getValue({
                    fieldId: 'createddate'
                });
            }
            log.debug({
                title: 'Count & CreatedDate',
                details: applyCount + " " + createdDate
            });

            //loop through apply lines
            for (var i = 0; i < applyCount; i++){

                var invId = tran.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'internalid',
                    line: i
                });
                log.debug({
                    title: 'Line Invoice',
                    details: invId
                });
                //Get Paid Status and Created From
                var invFields = search.lookupFields({
                    type: 'invoice',
                    id: invId,
                    columns: ['status', 'createdfrom', 'custbody_oa_invoice_number']
                });
                log.debug({
                    title: 'Invoice Fields',
                    details: invFields
                });
                //Initialize values
                var invStatus = '';
                var invCreatedFrom = '';
                if(invFields.status){
                    invStatus = invFields.status[0].value;
                }
                log.debug({
                    title: 'Invoice Status',
                    details: invStatus
                });
                if(invFields.createdfrom != ''){
                    invCreatedFrom = invFields.createdfrom[0].value;
                }


                log.debug({
                    title: 'Created From',
                    details: invCreatedFrom
                });

                if (invFields.custbody_oa_invoice_number){
                    log.debug('Is OA Invoice', invFields.custbody_oa_invoice_number[0].value);
                    continue;
                }else{
                    if(invStatus == 'paidInFull') {
                        if(invCreatedFrom != ''){
                            var so = record.load({
                                type: 'salesorder',
                                id: invCreatedFrom
                            });
                            so.setValue({
                                fieldId: 'custbody_scg_inv_paid',
                                value: createdDate
                            });
                            so.save();

                        }else{
                            var inv = record.submitFields({
                                type:record.Type.INVOICE,
                                id:invId,
                                values:{'custbody_scg_inv_paid':createdDate}
                            });

                        }


                    }
                }








            }//end for loop






        }//end paid status function









        return{
            //beforeLoad : beforeLoad,
            //beforeSubmit : beforeSubmit,
            afterSubmit : afterSubmit

        }


    });//end main

/**
 * Logs an exception to the script execution log
 *
 * @appliedtorecord customer
 *
 * @param {String} e Exception
 * @returns {Void}
 */
function mri_logError(e) {
    // Log the error based on available details
    if (e instanceof nlobjError) {
        log.error('System Error', e.getCode() + '\n' + e.getDetails());
        //alert(e.getCode() + '\n' + e.getDetails());
    } else {
        log.error('Unexpected Error', e.toString());
        //alert(e.toString());
    }
}
