/**
 * @NApiVersion 2.0
 * @NScriptType WorkflowActionScript
 *
 *
 * Version 2.0 Bobby Brown 4/13/21
 */

define (['N/search',
        'N/record',
        'N/task',
        '../SuiteBundles/Bundle 233521/Zone Advanced Billing/lib/Third Party/_scg_zab_lib.js'],
    function (search,record,task,ZAB_CONSTANTS){
        const PARENT = 1;
        const SITE_BILL_TO = 2;
        const SPLIT_BY_SITE = 3;
        const NO_COMBINE = 7;

        /**
         *
         * @param context
         * @param {object} context.newRecord
         * @param {object} context.oldRecord
         * @param {integer} context.workflowId
         * @param {string} context.type
         */
        function onAction(context){



            try{

                try{
              //      var subItems = getSubscriptionItems(context);
                }catch (e) {
                    log.error({
                        title:'Error Getting Subscription Items',
                        details:e
                    });
                }


                //get old record billing profile
                var billingProfileOld = context.oldRecord.getValue({
                    fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field.BILLING_PROFILE
                });
                log.debug({
                    title: 'Old Billing Profile',
                    details: billingProfileOld
                });
                //get new record billing profile
                var billingProfileNew = context.newRecord.getValue({
                    fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field.BILLING_PROFILE
                });

                log.debug({
                    title: 'New Billing Profile',
                    details: billingProfileNew
                });
                var changeType = '';


                //Run if changing from Bill To Sites to Bundled Fee to Parent or Bill To Parent, Split by Site
                if((billingProfileNew==PARENT|| billingProfileNew==SPLIT_BY_SITE)&&(billingProfileOld==SITE_BILL_TO)){
                    //changeToParentLevel(context, subItems);
                    changeType = 'toParent';
                }

                //Run if changing from Bundled Fee to Parent or Bill to Parent, Split by Site; to Bill To Sites
                //Run if changing from Bill To Sites to Bundled Fee to Parent or Bill To Parent, Split by Site
                if((billingProfileOld==PARENT|| billingProfileOld==SPLIT_BY_SITE)&&(billingProfileNew==SITE_BILL_TO)){
                    //changeToSiteLevel(context, subItems);
                    changeType = 'toSite';
                }

                //run if changing to no combining
                if(billingProfileNew==NO_COMBINE){
                   // changeToNoCombining(context,subItems);
                    changeType = 'toUnBundle';
                }
                var t = task.create({
                    taskType:task.TaskType.SCHEDULED_SCRIPT,
                });
                t.params = {
                    'custscript_scg_change_type':changeType,
                    'custscript_scg_sub_id':context.newRecord.id
                }
                log.debug({
                    title:'Parameters',
                    details:t.params
                });
                t.scriptId = 'customscript_scg_ss_bill_to_reset';
                t.deploymentId = 'customdeploy_scg_reset_billing';
                var taskId = t.submit();





            }catch (e) {
                log.error({
                    title: 'Error Changing Billing Profile',
                    details: e
                });
            }




        }

        /**
         *
         * Runs when changing to site level billing, loops through all subscription items associated with the
         * subscription and sets Bill To Override = Site Account
         *
         * @param context
         * @param {object} context.newRecord
         * @param {object} context.oldRecord
         * @param {integer} context.workflowId
         * @param {string} context.type
         * @param {ResultSet} subItemResultSet
         */
        function changeToSiteLevel(context,subItemResultSet){

            try{

                subItemResultSet.each(function (result) {
                    log.debug(result);
                    var siteAccount = result.getValue({
                        name:'custrecordmri_si_site_level_account'
                    });
                    record.submitFields({
                        type:ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION_ITEM.ID,
                        id: result.id,
                        values:{
                            'custrecordzab_si_bill_to_customer':siteAccount,
                            'custrecordzab_si_generate_forecast_charg':true
                        }
                    });
                    return true;

                });


            }catch (e) {
                log.error({
                    title:'Error Changing To Site level billing',
                    details: e
                });
            }//end catch

        }//end change to site level

        /**
         * Runs when changing to non-site level billing, loops thought all subscription items associated with
         * the subscription and deletes bill to override
         *
         * @param context
         * @param {object} context.newRecord
         * @param {object} context.oldRecord
         * @param {integer} context.workflowId
         * @param {string} context.type
         * @param {ResultSet}
         */
        function changeToParentLevel(context, subItemResultSet){
            try{
                subItemResultSet.each(function (result) {
                    log.debug(result);

                    record.submitFields({
                        type:ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION_ITEM.ID,
                        id: result.id,
                        values:{
                            'custrecordzab_si_bill_to_customer':'',
                            'custrecordzab_si_generate_forecast_charg':true
                        }
                    });
                    return true;

                });


            }catch (e) {
                log.error({
                    title:'Error Changing To Parent level billing',
                    details: e
                });
            }//end catch


        }//end change to parent level

        /**
         *
         * Runs when changing to site level billing, loops through all subscription items associated with the
         * subscription and sets Bill To Override = Site Account
         *
         * @param context
         * @param {object} context.newRecord
         * @param {object} context.oldRecord
         * @param {integer} context.workflowId
         * @param {string} context.type
         * @param {ResultSet} subItemResultSet
         */
        function changeToNoCombining(context,subItemResultSet){

            try{

                subItemResultSet.each(function (result) {
                    log.debug(result);

                    record.submitFields({
                        type:ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION_ITEM.ID,
                        id: result.id,
                        values:{
                            'custrecordzab_si_bill_to_customer':'',
                            'custrecordzab_si_generate_forecast_charg':true,
                            'custrecord_scg_no_bundle':true
                        }
                    });
                    return true;

                });


            }catch (e) {
                log.error({
                    title:'Error Changing To Site level billing',
                    details: e
                });
            }//end catch

        }//end change to site level

        /**
         *
         * Get all subscription Items associated with the subscription
         *
         * @param context
         * @param {object} context.newRecord
         * @param {object} context.oldRecord
         * @param {integer} context.workflowId
         * @param {string} context.type
         *
         * @returns {ResultSet} searchResults
         */
        function getSubscriptionItems(context){
            var subscription = context.newRecord;
            var filters = [];
            var columns = [];


            //add filters
            filters.push(search.createFilter({
                name:ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION_ITEM.Field.SUB,
                operator: search.Operator.IS,
                values: subscription.id
            }));

            columns.push(search.createColumn({
                name: ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION_ITEM.Field.SUB
            }));
            columns.push(search.createColumn({
                name: 'custrecordzab_si_bill_to_customer'
            }));
            columns.push(search.createColumn({
                name: 'custrecordmri_si_site_level_account'
            }));



            var subItemSearch = search.create({
                type:ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION_ITEM.ID,
                filters:filters,
                columns:columns,
            });

            var searchResults = subItemSearch.run();

            return searchResults;



        }



        //end
        return{
            onAction:onAction
        }




    });//end