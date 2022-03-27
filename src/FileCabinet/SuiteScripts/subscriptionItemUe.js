/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *
 *
 * 3/1/21 V1 - Set Project Id based SF ID and set bill to override if site level billing
 *
 * 4/20/21 V2 - Added logic for setting site level emails
 *
 */

define(["N/record", "N/error", "N/search"], function (record, error, search) {
    function beforeSubmit(context) {
        try {
            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            )
                return;
            // setBillTo(context);
        } catch (e) {
            log.error({
                title: "Error",
                details: e
            });
        }
    }
    function afterSubmit(context) {
        try {
            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            )
                return;

            setProjId(context);
        } catch (e) {
            log.error({
                title: "Error setting project",
                details: e
            });
        }
        // try{
        //     if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;
        //
        //     setBillTo(context);
        // }catch (e) {
        //     log.error({
        //         title: 'Error setting billto',
        //         details: e
        //     });
        //
        // }
    }

    /**
     *
     * @param context
     */
    function setBillTo(context) {
        //Load subscription item
        var subI = context.newRecord.id;
        subI = record.load({
            type: "customrecordzab_subscription_item",
            id: subI
        });

        var site = subI.getValue({
            fieldId: "custrecordmri_si_site_level_account"
        });

        var sub = record.load({
            type: "customrecordzab_subscription",
            id: subI.getValue({
                fieldId: "custrecordzab_si_subscription"
            })
        });

        var billingProfile = sub.getValue({
            fieldId: "custrecordzab_s_billing_profile"
        });

        //No Combining Billing Profile = 7
        if (billingProfile == 7) {
            subI.setValue({
                fieldId: "custrecord_scg_no_bundle",
                value: true
            });
        }

        if (billingProfile == 2 || billingProfile == 8) {
            subI.setValue({
                fieldId: "custrecordzab_si_bill_to_customer",
                value: site
            });
            //site level billing fields

            //load site customer
            site = record.load({
                type: "customer",
                id: site
            });

            //get address count and find default billing address
            var addCount = site.getLineCount("addressbook");
            var siteEmails = "";
            var defaultBilling;

            for (var i = 0; i < addCount; i++) {
                var x = site.getSublistValue({
                    sublistId: "addressbook",
                    fieldId: "defaultbilling",
                    line: i
                });
                if (x == true) {
                    defaultBilling = site.getSublistValue({
                        sublistId: "addressbook",
                        fieldId: "id",
                        line: i
                    });

                    var billAdd = site.getSublistSubrecord({
                        sublistId: "addressbook",
                        fieldId: "addressbookaddress",
                        line: i
                    });
                    siteEmails = billAdd.getValue({
                        fieldId: "custrecord_scg_address_email"
                    });

                    break;
                }
            }

            subI.setValue({
                fieldId: "custrecordzab_si_billing_address",
                value: defaultBilling
            });
            if (
                siteEmails !== "" &&
                siteEmails !== "undefined" &&
                siteEmails != null
            ) {
                subI.setValue({
                    fieldId: "custrecordzab_si_inv_email_address_list",
                    value: siteEmails
                });
                subI.setValue({
                    fieldId: "custrecordmri_si_email_d",
                    value: true
                });
            }
        } else {
            var emails = sub.getValue({
                fieldId: "custrecordzab_s_inv_email_address_list"
            });
            var semails = subI.getValue({
                fieldId: "custrecordzab_si_inv_email_address_list"
            });
            if (semails == "" && emails != "") {
                subI.setValue({
                    fieldId: "custrecordzab_si_inv_email_address_list",
                    value: emails
                });
                subI.setValue({
                    fieldId: "custrecordmri_si_email_d",
                    value: true
                });
            }
        }
        subI.save();
    }

    /**
     * Grab SFDC project ID and determine correct NS internal id
     * @param context
     */
    function setProjId(context) {
        var subI = context.newRecord;
        var sfid = subI.getValue({
            fieldId: "custrecordmri_si_sf_project_id"
        });

        if (sfid) {
            var columns = [];
            var filters = [];
            filters.push(
                search.createFilter({
                    name: "custentity_mri_sf_project_id",
                    operator: search.Operator.IS,
                    values: sfid
                })
            );
            columns.push(
                search.createColumn({
                    name: "internalid"
                })
            );
            columns.push(
                search.createColumn({
                    name: "custentity_mri_sf_project_id"
                })
            );

            var mySearch = search.create({
                type: "job",
                filters: filters,
                columns: columns
            });

            mySearch.run().each(function (result) {
                var proj = result.id;
                var sub_i = record.submitFields({
                    type: "customrecordzab_subscription_item",
                    id: subI.id,
                    values: {
                        custrecordzab_si_ns_proj: proj.toString()
                    }
                });
            });
        } //end if
    }

    const setNSProjId = context => {
        const subItem = context.newRecord;
        const sfId = subItem.getValue({
            fieldId: "custrecordmri_si_sf_project_id"
        });

        // return if no project id
        if (!sfId) return;

        const jobSearchObj = search.create({
            type: "job",
            filters: [["custentity_mri_sf_project_id", "startswith", "1"]],
            columns: ["internalid", "custentity_mri_sf_project_id"]
        });
        const res = jobSearchObj.run().getRange(0, 1000);
        if (res.length > 1)
            throw error.create({
                name: "DUPLICATE PROJECT IDS",
                message: `DUP PROJECTS FOUND FOR ${sfId}`
            });

        const projId = res[0].id;
        record.submitFields({
            type: "customrecordzab_subscription_item",
            id: subItem.id,
            values: {
                custrecordzab_si_ns_proj: projId
            }
        });
    };

    /**
     *
     * @param context
     */
    function setUsageNeed(context) {
        var usageType;
        var usageTypes = new Array();

        const RHRUSAGE = 14184; //SB value
        usageTypes.push(RHRUSAGE);
        const TEUSAGE = 14284; //SB value
        usageTypes.push(TEUSAGE);
        const MFIP = 16440; //SB value
        usageTypes.push(MFIP);
        const RESCHECK = 16403; //SB value
        usageTypes.push(RESCHECK);

        var item = context.newRecord.getValue({
            fieldId: "custrecordzab_si_item"
        });

        if (item == RHRUSAGE || item == TEUSAGE) {
            usageType = 1;
        } else if (item == RESCHECK) {
            usageType = 2;
        } else if (item == MFIP) {
            usageType = 3;
        }
        if (!usageType) {
            return;
        }

        context.newRecord.setValue({
            fieldId: "custrecord_scg_si_usage_detail",
            value: usageType
        });

        /**     var sub = context.newRecord.getValue({
                fieldId: 'custrecordzab_si_subscription'
            });

             var success = record.submitFields({
                id: sub,
                type: 'customrecordzab_subscription',
                values: {
                    'custrecord_scg_u_detail': usageType
                }
             */ //  });
    }

    // const setCSLabel = context => {
    //     if (context.type === context.UserEventType.CREATE) {
    //         const newRec = context.newRecord;
    //         let csId = newRec.getValue({
    //             fieldId: "custrecordzab_si_charge_schedule"
    //         });
    //         if (!csId || csId === "") {
    //             let subCs = search.lookupFields({
    //                 type: "customrecordzab_subscription",
    //                 id: newRec.getValue({
    //                     fieldId: "custrecordzab_si_subscription"
    //                 }),
    //                 columns: ["custrecordzab_s_charge_schedule"]
    //             });
    //             subCs = subCs[0].value;
    //             csId = subCs;
    //         }
    //
    //         let csDisplay = search.lookupFields({
    //             type: "customrecordzab_charge_schedules",
    //             id: csId,
    //             columns:['custrecord_scg_cs_disp']
    //         });
    //         newRec
    //
    //     }
    //};

    return {
        //  beforeLoad : beforeLoad,
        //    beforeSubmit : beforeSubmit,
        afterSubmit: afterSubmit
    }; //end return
}); //end main function
