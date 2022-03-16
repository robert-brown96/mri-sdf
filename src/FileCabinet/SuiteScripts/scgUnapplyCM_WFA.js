/**
 * @NApiVersion 2.0
 * @NScriptType WorkflowActionScript
 *
 *
 * Unapplies CM from Invoice
 *
 */
define(['N/record'],
    function (record) {
    /**
     *
     * @param context
     * @param {object} context.newRecord
     * @param {object} context.oldRecord
     * @param {integer} context.workflowId
     * @param {string} context.type
     * */
    function onAction(context) {

        try{
            //get credit memo
            var cM = context.newRecord;


            var appStatus = cM.getValue({
                fieldId:'custbody_scg_cm_approval_status'
            });

            var createdFromInv = cM.getValue({
                fieldId:'createdfrom'
            });

            var applyCount = cM.getLineCount({
                sublistId:'apply'
            });

            var totalValue = cM.getValue({
                fieldId:'total'
            });

            if(appStatus == 1){//pending only

                for(var i = 0; i < applyCount; i++){
                    cM.selectLine({
                        sublistId:'apply',
                        line:i
                    });
                    var apply = cM.getSublistValue({
                        sublistId:'apply',
                        fieldId:'apply',
                        line:i
                    });
                    if (apply==true){
                        cM.setCurrentSublistValue({
                            sublistId:'apply',
                            fieldId:'apply',
                            value:false
                        });
                        cM.setCurrentSublistValue({
                            sublistId:'apply',
                            fieldId:'amount',
                            value:''
                        });
                        cM.commitLine({
                            sublistId:'apply'
                        });
                        cM.setValue({
                            fieldId:'applied',
                            value:0
                        });
                        cM.setValue({
                            fieldId:'unapplied',
                            value:totalValue
                        });


                    }
                }



            }





        }catch (e) {
            log.error({
                title:'Error Unapplying CM',
                details:e
            });
        }


    }



    return{
        onAction:onAction
    };

    });