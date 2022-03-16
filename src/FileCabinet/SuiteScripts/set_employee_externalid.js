/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/record'
    ],
    
    (record) => {


        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (context) => {
                if(context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

                try{
                        if(context.type === context.UserEventType.CREATE){
                                let rec = context.newRecord;

                                let concurId = rec.getValue({
                                        fieldId:'custentity_mri_concur_emp_id'
                                });
                                if(!concurId) return;
                                record.submitFields({
                                        type:record.Type.EMPLOYEE,
                                        id:rec.id,
                                        values:{
                                                'externalid':concurId
                                        }
                                });
                        }else{
                                let newRec = context.newRecord;
                                let oldRec = context.oldRecord;

                                let oldConcurId = oldRec.getValue({
                                        fieldId:'custentity_mri_concur_emp_id'
                                });
                                let oldExtId = oldRec.getValue({
                                        fieldId:'externalid'
                                });
                                let newConcurId = newRec.getValue({
                                        fieldId:'custentity_mri_concur_emp_id'
                                });

                                if((newConcurId !== oldConcurId) || (!oldExtId && newConcurId)){
                                        record.submitFields({
                                                type:record.Type.EMPLOYEE,
                                                id:newRec.id,
                                                values:{
                                                        'externalid':newConcurId
                                                }
                                        })
                                }

                        }


                }catch (e) {
                        log.error({
                                title:'ERROR SETTING EXTERNAL ID',
                                details:e
                        });
                }

        }

        return {afterSubmit}

    });
