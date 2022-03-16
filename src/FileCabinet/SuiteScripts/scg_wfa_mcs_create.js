/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope SameAccount
 *
 * Version 2.0 Bobby Brown 3/9/21
 */

define (['N/search',
        'N/record',
        'N/task',
        'N/runtime',
        './Lib/_scg_zab_lib.js'],
     (search,record,task,runtime,CONSTANTS) =>{

        /**
         *
         * @param context
         * @param {object} context.newRecord
         */
        const onAction = (context) => {

            try{
                //get parameters
                var script = runtime.getCurrentScript();
                var countRecs = [];



                var countRecString = context.newRecord.id;
                countRecs.push(countRecString);
                var billingRecurrence = script.getParameter({
                    name:'custscript_scg_billing_f'
                });

                log.debug({
                    title:countRecs,
                    details:billingRecurrence
                });

                if(billingRecurrence===4){
                    CONSTANTS.quarterlyChargesMoment(countRecs);
                }else if(billingRecurrence===2){
                    CONSTANTS.biannualChargesMoment(countRecs);
                }




            }catch (e) {
                log.error({
                    title:'Error generating count records',
                    details:e
                });
            }
        }





        //end
        return{
            onAction:onAction
        }




    });//end