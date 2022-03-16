/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * @author Bobby Brown 9/13/2021
 * Displays a pop up confirmation message on invoices with a blank PO if the customer requires it
 */
define([
        'N/record',
        'N/search',
        'N/ui/dialog'
    ],

    function (record, search, dialog) {


        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        const saveRecord = (context) => {
            try {
                let poValue = context.currentRecord.getValue({
                    fieldId: 'otherrefnum'
                });
                log.debug({
                    title:'PO',
                    details:poValue
                });
                if (!poValue || poValue === "") {
                    const cus = context.currentRecord.getValue('entity')
                    let r = search.lookupFields({
                        type: search.Type.CUSTOMER,
                        id: cus,
                        columns: [
                            'custentity_mri_po_required'
                        ]
                    });
                    log.debug({
                        title:'Cus Lookup',
                        details:r
                    })
                    if (r['custentity_mri_po_required'] === true) {
                        const message = {
                            title:'This customer requires a PO.',
                            message:'Are you sure you wish to save?'
                        };
                        /*dialog.confirm(message)
                            .then(()=> {
                                return true
                            })
                            .catch(()=>{
                                return false
                            })
*/

                        return confirm('This customer requires a PO. \n\nAre you sure you wish to save?');

                    }else{
                        return true;
                    }
                }
                return true;


            } catch (e) {
                log.error({
                    title: 'Error checking PO',
                    details: e
                })
            }

        }

        return {

            saveRecord: saveRecord
        };

    });
