/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 *
 * @author Bobby Brown
 * Disallows posting to CTA account on Journals and AICJE
 *
 */
define(['N/record','N/ui/dialog'],
    function (record,dialog) {

        /**
         *
         * @param context
         * @param {Record} context.currentRecord
         * @param {String} context.sublistId
         *
         * @returns {boolean} Return true if valid sublist line
         */
        function validateLine(context) {
            try{
                return checkAccount(context);
            }catch (e) {
                log.error({
                    title: 'Error Validating Line',
                    details: e
                });
            }

        }

        /**
         *
         * @param context
         * @param {Record} context.currentRecord
         * @param {String} context.sublistId
         *
         * @returns {boolean} Return true if valid sublist line
         */
        function checkAccount(context) {
            //CTA and incorrect sales tax account
            const restrictedAccounts = [110,227];
            var currentRecord = context.currentRecord;
            var sublist = context.sublistId;
            var check = true;

            if (sublist === 'line'){
                var account = currentRecord.getCurrentSublistValue({
                    sublistId:sublist,
                    fieldId:'account'
                });
                if(restrictedAccounts.indexOf(parseInt(account)) > -1){
                    check = false
                    log.debug('restricted');
                    dialog.alert({
                        title:'Error',
                        message:'Manual Postings to this account are not allowed'
                    });
                }

            }
            return check;



            
        }
        
        
        return{
            validateLine : validateLine
        }
    });//end callback