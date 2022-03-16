/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *
 *
 *@author Bobby Brown
 * 8/19/21 - Revision to be based on Address emails
 *
 */
define(['N/record','N/error','N/search'],
    function (record,error,search){

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         * @Since 2015.2
         */
        const beforeSubmit = (context) => {

            try {
                if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;
                addCurrency(context);

            }catch (e){
                log.error({
                    title: 'Error Adding Currency',
                    details: e
                });
            }
        }
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         * @Since 2015.2
         */
        const afterSubmit = (context) => {
            try{
                if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;
                setAddressEmail(context);
            }catch(e) {
                log.error({
                    title: 'Error in After Submit',
                    details:e
                });

            }

        }

        /**
         *
         * @param context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         *
         */
        const addCurrency = (context) =>{
            //only run on create
            if (context.type !== context.UserEventType.CREATE) return;

            //get new record
            const sub = context.newRecord;

            //currency of Subscription
            const currency = sub.getValue({
                fieldId:'custrecordzab_s_currency'
            });

            //get customer
            const customer = record.load({
                type:'customer',
                id:sub.getValue('custrecordzab_s_customer'),
                isDynamic:true
            });

            //get count of currencies
            const count = customer.getLineCount('currency');

            let currencies = [];

            for (let i = 0; i < count; i++){

                let c = customer.getSublistValue({
                    sublistId:'currency',
                    fieldId:'currency',
                    line:i
                });

                currencies.push(c);
            }


            let check = currencies.indexOf(currency);

            if (check == -1){
                //create new customer currency
                customer.selectNewLine({
                    sublistId:'currency',
                    line:count+1
                });
                customer.setCurrentSublistValue({
                    sublistId:'currency',
                    fieldId:'currency',
                    value:currency
                });
                customer.commitLine({
                    sublistId:'currency'
                });
                customer.save();
            }





        }


        /**
         *Address BASED
         *
         *
         * @param context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         *
         */
        const setAddressEmail = (context) => {
            const sub = record.load({
                type:context.newRecord.type,
                id:context.newRecord.id
            });





            //get customer
            const cus = record.load({
                type:'customer',
                id:sub.getValue('custrecordzab_s_customer'),
                isDynamic:false
            });

            let emails = '';

            const lineCount = cus.getLineCount({
                sublistId:'addressbook'
            });
            let addressId;



            if(lineCount > 0){
                for (let i=0; i<lineCount; i++){
                    let defaultBilling = cus.getSublistValue({
                        sublistId:'addressbook',
                        fieldId:'defaultbilling',
                        line:i
                    });
                    //run if it is the default billing address
                    if(defaultBilling === true){
                        addressId = cus.getSublistValue({
                            sublistId:'addressbook',
                            fieldId:'internalid',
                            line:i
                        });
                        let defaultBillingAddressRec = cus.getSublistSubrecord({
                            sublistId:'addressbook',
                            fieldId:'addressbookaddress',
                            line:i
                        });
                        let email = defaultBillingAddressRec.getValue({
                            fieldId:'custrecord_scg_address_email'
                        });
                        let additionalEmail = defaultBillingAddressRec.getValue({
                            fieldId:'custrecord_scg_a_email_list'
                        });


                        if(additionalEmail !== '' && additionalEmail !== 'undefined'){
                            emails = email + ',' + additionalEmail
                        }else {
                            emails = email
                        }
                        log.debug({
                            title:'Emails:',
                            details:emails
                        });
                        break;



                    }

                }
                if(emails !== '' && emails !== 'undefined'){
                    if(context.type === context.UserEventType.EDIT){
                        let oldEmail = context.oldRecord.getValue({
                            fieldId:'custrecordzab_s_inv_email_address_list'
                        });
                        if (oldEmail !== '' && oldEmail !== emails){ //stop if the old email was not blank and is different from result
                            log.debug({
                                title:'BAIL',
                                details:oldEmail
                            })
                            return;
                        }
                    }
                    sub.setValue({
                        fieldId:'custrecordzab_s_inv_email_address_list',
                        value: emails
                    });
                    sub.setValue({
                        fieldId:'custrecordmri_s_email_delivery',
                        value:true
                    });
                    sub.save();
                }
            }
        }




        return{
            //  beforeLoad : beforeLoad,
            beforeSubmit : beforeSubmit,
            afterSubmit : afterSubmit
        }//end return

    });//end main function