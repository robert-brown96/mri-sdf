/**
 * @NApiVersion 2.1
 *
 *
 *
 *
 */
define([
    "N/record",
    "N/search",
    "N/file",
    "N/render",
    "N/task",
    "SuiteScripts/Lib/lodash.min",
    "SuiteScripts/Lib/moment.min"
], function (record, search, file, render, task, _, moment) {
    return {
        chargeDataSearch: function (dataIn, charges) {
            var chargeDataSearch;
            chargeDataSearch = search
                .create({
                    type: "customrecordzab_charge",
                    filters: [
                        ["internalid", search.Operator.ANYOF, dataIn.chargeIds]
                        //additional filter needed for when to do the action
                    ],
                    columns: [
                        "internalid",
                        "custrecordzab_c_charge_period_start_date",
                        "custrecordzab_c_charge_period_end_date",
                        "custrecordzab_c_subscription_item",
                        "custrecordzab_c_transaction",
                        {
                            name: "custrecord_scg_pull_client_id",
                            join: "custrecordzab_c_subscription_item"
                        },
                        {
                            name: "custrecordzab_si_item",
                            join: "custrecordzab_c_subscription_item"
                        }
                    ]
                })
                .runPaged({ pageSize: 1000 });
            //Arrange results
            chargeDataSearch.pageRanges.forEach(function (pageRange) {
                chargeDataSearch
                    .fetch({ index: pageRange.index })
                    .data.forEach(function (result) {
                        /**
                         * Charge array
                         * @typedef {Object} ZABCharge
                         * @property {string} id
                         * @property {string} start_date
                         * @property {string} end_date
                         * @property {string} subscription_item
                         * @property {string} transaction_id
                         * @property {string} clientId
                         * @property {string} prod
                         * @property {string} customer
                         */
                        charges.push({
                            id: result.getValue({ name: "internalid" }),
                            start_date: result.getValue({
                                name: "custrecordzab_c_charge_period_start_date"
                            }),
                            end_date: result.getValue({
                                name: "custrecordzab_c_charge_period_end_date"
                            }),
                            subscription_item: result.getValue({
                                name: "custrecordzab_c_subscription_item"
                            }),
                            transaction_id: result.getValue({
                                name: "custrecordzab_c_transaction"
                            }),
                            clientId: result.getValue({
                                name: "custrecord_scg_pull_client_id",
                                join: "custrecordzab_c_subscription_item"
                            }),
                            prod: result.getValue({
                                name: "custrecordzab_si_item",
                                join: "custrecordzab_c_subscription_item"
                            }),
                            customer: result.getValue({
                                name: "custrecordzab_c_customer"
                            })
                        }); //pushed
                    }); //end fetch
            }); //end pageRanges
            return charges;
        },

        RECORD_TYPE: {
            ZAB_CHARGE: {
                ID: "customrecordzab_charge",
                Field: {
                    INTERNAL_ID: "internalid",
                    SUBSCRIPTION_ITEM: "custrecordzab_c_subscription_item",
                    TRANSACTION: "custrecordzab_c_transaction",
                    START_DATE: "custrecordzab_c_charge_period_start_date",
                    END_DATE: "custrecordzab_c_charge_period_end_date",
                    SUBSCRIPTION: "custrecordzab_c_subscription"
                }
            },
            NS_TRANSACTION: {
                Body_Field: {
                    USAGE_STRING_DETAIL: "custbody_scg_stringify_usage",
                    USAGE_NEED: "custbody_usage_detail_need",
                    USAGE_FILE: "custbody_scg_usage_file_attach",
                    EZYPAY_TYPE: "custbody_scg_ezypay_method",
                    EZYPAY_TOKEN: "custbody_scg_ezy_pmt_meth_token"
                },
                LINE: {}
            },
            ZAB_COUNT: {
                ID: "customrecordzab_count_data",
                Field: {
                    EFFECTIVE_DATE: "custrecordzab_cd_effective_date",
                    END_DATE: "custrecordzab_cd_end_date",
                    SUBSCRIPTION: "custrecordzab_cd_subscription",
                    ITEM: "custrecordzab_cd_item",
                    QUANTITY: "custrecordzab_cd_quantity",
                    RATE: "custrecordzab_cd_rate",
                    CUSTOMER: "custrecord_scg_count_cus",
                    SITE: "custrecord_scg_count_site",
                    INITIAL_BILL: "custrecord_scg_count_bill_date_override",
                    OLI: "custrecord_scg_count_oli",
                    LOCATION: "custrecord_scg_count_loc",
                    BILL_TO: "custrecord_scg_cd_bill_override",
                    EMAILS: "custrecordscg_cd_inv_email_address_list",
                    EMAIL_DELIVERY: "custrecord_scg_cd_email_delivery",
                    NEXT_UPLIFT: "custrecord_scg_cd_next_uplift",
                    UPLIFT: "custrecord_scg_cd_uplift",
                    ASSET: "custrecord_scg_sf_asset",
                    AAT: "custrecord_scg_aat_id",
                    DO_NOT_BUNDLE: "custrecord_scg_dont_bundle",
                    BILL_ADDRESS_OVERRIDE:
                        "custrecord_scg_bill_address_overridee",
                    ORIGINAL_END: "custrecord_scg_original_end",
                    ORIGINAL_RATE: "custrecord_scg_cd_origin_rate",
                    RECURRENCE_COUNT: "custrecord_scg_recurrence_count",
                    PARENT_COUNT: "custrecord_scg_parent_count",
                    PROCESSED_COUNT: "custrecord_scg_processed_count",
                    LAST_PROCESSED: "custrecord_scg_last_process_date",
                    FROM_REC: "custrecord_scg_from_record_bg",
                    TO_REC: "custrecord_scg_to_record_bg"
                }
            },
            SCG_COUNT: {
                ID: "customrecord_scg_cd_billing",
                Field: {
                    COUNT: "custrecord_scg_count_rec_p",
                    START_DATE: "custrecord_scg_sc_start",
                    END_DATE: "custrecord_scg_sc_end_date",
                    SUB: "custrecord_scg_sc_sub"
                }
            },
            ZAB_SUBSCRIPTION_ITEM: {
                ID: "customrecordzab_subscription_item",
                Field: {
                    REGEN: "custrecordzab_si_generate_forecast_charg",
                    PAID_THROUGH: "custrecord_scg_paid_through",
                    PRODUCT: "custrecordzab_si_item",
                    CUSTOMER: "custrecordzab_si_customer",
                    SUB: "custrecordzab_si_subscription",
                    CURRENCY: "custrecordzab_si_currency"
                }
            },
            ZAB_SUBSCRIPTION: {
                ID: "customrecordzab_subscription",
                Field: {
                    CUSTOMER: "custrecordzab_s_customer",
                    CHARGE_SCHEDULE: "custrecordzab_s_charge_schedule",
                    MAX_ARR: "custrecord_scg_max_arr",
                    USAGE_NEED: "custrecord_scg_u_detail",
                    INVOICE_EMAILS: "custrecordzab_s_inv_email_address_list",
                    BILLING_PROFILE: "custrecordzab_s_billing_profile",
                    START_DATE: "custrecordzab_s_start_date",
                    END_DATE: "custrecordzab_s_end_date",
                    EVERGREEN_TERM: "custrecordzab_s_evergreen_months",
                    LAST_UPLIFTED: "custrecord_scg_last_uplift_date",
                    LAST_UPLIFT_EFFECTIVE: "custrecord_scg_last_change_rate",
                    NEXT_ANNIVERSARY: "custrecord_scg_next_anniversary"
                }
            },
            MRI_INSURANCE: {
                ID: "customrecord_scg_insurance_usage",
                Field: {
                    INTERNAL_ID: "internalid",
                    PRODUCT: "custrecord_scg_i_prod",
                    CUSTOMER: "custrecord_scg_i_customer",
                    SERVICE_DATE: "custrecord_scg_i_date"
                }
            },
            MRI_SCREENING: {
                ID: "customrecord_scg_mri_screening",
                Field: {
                    INTERNAL_ID: "internalid",
                    USAGE_DATE: "custrecord_scg_main_date",
                    ITEM: "custrecord_scg_prod",
                    CLIENT_ID: "custrecord_scg_client_id",
                    APP_NAME: "custrecord_scg_app_name"
                }
            },
            USAGE_TYPE: {
                LISTID: "customlist_usagedetail_types",
                VALUES: {
                    RHR: 1,
                    RESCHECK: 2,
                    MFIP: 3,
                    CALLMAX: 4
                }
            }
        },

        createCSVFile: function (tranId, usageSearch) {
            log.debug({
                title: "Creating CSV",
                details: usageSearch
            });

            try {
                var columns = usageSearch.columns;

                //SA 62735
                //Initialize Values Arrays
                var content = [];
                var cells = [];
                var headers = [];
                var temp = [];
                var x = 0;

                for (var i = 0; i < columns.length; i++) {
                    headers[i] = columns[i].label;
                    log.debug("col", headers[i]);
                }
                content[x] = headers;
                x = 1;

                usageSearch.run().each(function (result) {
                    for (var y = 0; y < columns.length; y++) {
                        var searchResult = result.getValue({
                            name: columns[y].name
                        });
                        temp[y] = searchResult;
                        log.debug(temp[y], searchResult);
                    } //end y for loop
                    content[x] += temp;
                    x++;

                    return true;
                }); //end run 1
                log.debug("Count", x);

                //Create string variable for content
                var contents = "";
                for (var z = 0; z < content.length; z++) {
                    contents += content[z].toString() + "\n";
                } //end z for

                var fileObj = file.create({
                    name: tranId + "usageDetailOutput",
                    fileType: file.Type.CSV,
                    contents: contents,
                    description: "usageOutput",
                    folder: 9175
                });

                var fileId = fileObj.save();

                return fileId;
            } catch (e) {
                log.error({
                    title: "Error Creating File",
                    details: e
                });
            } finally {
                log.audit({
                    title: "File Created",
                    details: fileId
                });
            }
        },

        /**
         * Used when over 4000 usage data records
         * @param dataIn
         * @param {string} dataIn.transactionId
         * @param {object} usageSearch
         * @returns {*|string|number|void}
         */
        createCSVFile2: function (dataIn, usageSearch) {
            log.debug({
                title: "Creating CSV",
                details: usageSearch
            });

            try {
                var columns = usageSearch.columns;

                //SA 62735
                //Initialize Values Arrays
                var content = new Array();
                var headers = [];
                var csvColumns = [];
                var lineOne = "";
                var x = 0;

                for (var i = 0; i < columns.length; i++) {
                    headers[i] = columns[i].label;
                    log.debug("col", headers[i]);
                }
                content[x] = headers;
                x = 1;

                var usageResultSet = usageSearch.run();
                // columns.forEach(function (col) {
                //     csvColumns.push(col.label);
                // });
                var currentRange = usageResultSet.getRange({
                    start: 0,
                    end: 1000
                });
                var i = 0; //iterator for search results
                var j = 0; //iteraotor for current
                while (j < currentRange.length) {
                    var result = currentRange[j];
                    var temp = "";

                    //logic on result
                    for (var t = 0; t < columns.length; t++) {
                        var searchResult = result.getValue({
                            name: columns[t].name
                        });
                        temp += '"' + searchResult + '"' + ",";
                        //  log.debug(temp, searchResult);
                    } //end y loop
                    content.push(temp);
                    x++;

                    //bump iterators
                    i++;
                    j++;
                    if (j === 1000) {
                        j = 0; //reset j
                        currentRange = usageResultSet.getRange({
                            start: i,
                            end: i + 1000
                        });
                    }
                }
                log.debug({
                    title: "While Loop Over",
                    details: usageResultSet.length
                });

                for (var k = 0; k < csvColumns.length; k++) {
                    lineOne += csvColumns[j] + ",";
                }
                lineOne = lineOne + "\n";

                for (var y = 0; y < content.length; y++) {
                    lineOne += content[y].toString() + "\n";
                }
                log.debug({
                    title: "Contents from Line One",
                    details: JSON.stringify(lineOne)
                });
                var fileObj = file.create({
                    name: dataIn.transactionId + "usageDetailOutput",
                    fileType: file.Type.CSV,
                    contents: lineOne,
                    description: "usageOutput",
                    folder: 9175,
                    isOnline: true
                });
                var fileId = fileObj.save();

                return fileId;
            } catch (e) {
                log.error({
                    title: "Error Creating File",
                    details: e
                });
            } finally {
                log.debug({
                    title: "Created File",
                    details: fileObj
                });
            }
        },

        /**
         *
         * @param tranId
         * @param usageSearch
         * @returns {*|string|number|void}
         */
        createCSVFile3: function (tranId, usageSearch) {
            try {
                var content = new Array();
                var csvColumns = new Array();
                var lineOne = "";

                var resultSet = usageSearch.run();

                resultSet.each(function (result) {
                    var temp = "";
                    for (var i = 0; i < usageSearch.columns.length; i++) {
                        var searchResult = result.getValue({
                            name: usageSearch.columns[i].name
                        });
                        temp += '"' + searchResult + '"' + ",";
                    }
                    content.push(temp);
                    return true;
                });

                resultSet.columns.forEach(function (col) {
                    csvColumns.push(col.label);
                });

                for (var j = 0; j < csvColumns.length; j++) {
                    lineOne += csvColumns[j] + ",";
                }
                lineOne = lineOne + "\n";
                for (var y = 0; y < content.length; y++) {
                    lineOne += content[y].toString() + "\n";
                }
                log.debug({
                    title: "Contents from Line One",
                    details: JSON.stringify(lineOne)
                });

                var fileObj = file.create({
                    name: tranId + "usageDetailOutput",
                    fileType: file.Type.CSV,
                    contents: lineOne,
                    description: "usageOutput",
                    folder: 9175,
                    isOnline: true
                });
                var fileId = fileObj.save();

                return fileId;
            } catch (e) {
                log.error({
                    title: "Error in CSV generation",
                    details: e
                });
            }
        },

        createPDFScreening: function (tranId, screenSearch) {
            log.debug({
                title: "Create PDF",
                details: screenSearch
            });
            try {
                var results = screenSearch.run().getRange({
                    start: 0,
                    end: 1000
                });

                var renderer = render.create();
                renderer.setTemplateById({
                    id: 105
                });
                renderer.addSearchResults({
                    templateName: "CUSTTMPL_105_1126916_SB1_483",
                    searchResult: results
                });

                var newFile = renderer.renderAsPdf();
                newFile.folder = 9175;
                newFile.name = tranId + "usageDetailOutput";
                newFile.isOnline = true;

                var fileId = newFile.save();

                var id = record.attach({
                    record: {
                        type: "file",
                        id: fileId
                    },
                    to: {
                        type: "salesorder",
                        id: tranId
                    }
                });
            } catch (e) {
                log.error({
                    title: "Error in PDF Gen",
                    details: e
                });
            }
        },

        getTransactionType: function (transactionId) {
            if (!transactionId) return;
            var tranTypeA = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: transactionId,
                columns: "type"
            });
            log.debug({
                title: "TranType",
                details: tranTypeA.type[0].value
            });
            var tranType;
            if (tranTypeA.type[0].value == "SalesOrd") {
                tranType = "salesorder";
            } else if (tranTypeA.type[0].value == "CustInvc") {
                tranType = "invoice";
            } else {
                tranType = "creditmemo";
            }

            return tranType;
        },
        /**
         *
         * @param {object} oldCd
         * @param {object}newCd
         * @param {string[]} subFields
         *
         * Sets AAT to and Initial bill date to null
         * Set Start Date to next anniversary from subscription
         * Set End date to +1 Year -1 Day of Start Date unless original is sooner
         * Set last processed date to today
         *
         * @returns {object}
         */
        setCoreCountFields: function (oldCd, newCd, subFields) {
            try {
                const COUNT = this.RECORD_TYPE.ZAB_COUNT;

                //clear the AAT ID
                newCd.setValue({
                    fieldId: COUNT.Field.AAT,
                    value: ""
                });
                newCd.setValue({
                    fieldId: COUNT.Field.INITIAL_BILL,
                    value: null
                });
                var start = new Date(
                    subFields["custrecord_scg_next_anniversary"]
                );
                newCd.setValue({
                    fieldId: COUNT.Field.EFFECTIVE_DATE,
                    value: start
                });

                var originalEnd = newCd.original_end;

                var end = start.setFullYear(start.getFullYear() + 1);

                end = new Date(end);
                newCd.setValue({
                    fieldId: COUNT.Field.NEXT_UPLIFT,
                    value: end
                });

                end.setDate(end.getDate() - 1);
                end = new Date(end);

                newCd.setValue({
                    fieldId: COUNT.Field.FROM_REC,
                    value: oldCd.id
                });

                newCd.setValue({
                    fieldId: COUNT.Field.END_DATE,
                    value: end
                });
                newCd.setValue({
                    fieldId: COUNT.Field.OLI,
                    value: 6
                });
                newCd.setValue({
                    fieldId: COUNT.Field.LAST_PROCESSED,
                    value: new Date()
                });

                return newCd;
            } catch (e) {
                log.error({
                    title: "Error Setting Count Fields",
                    details: e
                });
            }
        },

        /**
         *
         * Creates a sub record of Count Data from an object
         *
         * @param data
         * @param data.start {Date} - Start Date of Record
         * @param data.end {Date} - End Date of Record
         * @param data.count {string} - ID of Count Record
         * @param data.sub {string} - ID of Subscription
         * @returns {number} - Internal ID of New Record
         */
        createBillingCountRec: function (data) {
            const RECORD_TYPE = this.RECORD_TYPE;
            var newRec = record.create({
                type: RECORD_TYPE.SCG_COUNT.ID,
                isDynamic: true
            });
            newRec.setValue({
                fieldId: RECORD_TYPE.SCG_COUNT.Field.COUNT,
                value: data.count
            });
            newRec.setValue({
                fieldId: RECORD_TYPE.SCG_COUNT.Field.START_DATE,
                value: data.start
            });
            newRec.setValue({
                fieldId: RECORD_TYPE.SCG_COUNT.Field.END_DATE,
                value: data.end
            });
            newRec.setValue({
                fieldId: RECORD_TYPE.SCG_COUNT.Field.SUB,
                value: data.sub
            });
            return newRec.save();
        },
        /**
         *
         * @param newCountRecords {string[]}
         */
        biannualChargesA: function (newCountRecords) {
            try {
                const COUNT = this.RECORD_TYPE.ZAB_COUNT;
                const THIS = this;

                _.forEach(newCountRecords, function (newCd) {
                    //get end date of new count record
                    var newCountFields = search.lookupFields({
                        type: COUNT.ID,
                        id: newCd,
                        columns: [
                            "custrecordzab_cd_end_date",
                            "custrecordzab_cd_effective_date",
                            "custrecordzab_cd_subscription"
                        ]
                    });

                    //get existing end date
                    var endOriginal = new Date(
                        newCountFields["custrecordzab_cd_end_date"]
                    );
                    var effectiveOriginal = new Date(
                        newCountFields["custrecordzab_cd_effective_date"]
                    );
                    var sub =
                        newCountFields.custrecordzab_cd_subscription[0].value;

                    //subtract 6 months
                    var start2 = endOriginal.setMonth(
                        endOriginal.getMonth() - 5,
                        0
                    );
                    start2 = new Date(start2);
                    if (effectiveOriginal < start2) {
                        //effective date is before end date less 6 months

                        //add 1 day
                        start2.setDate(start2.getDate() + 1);
                        start2 = new Date(start2);
                        //save new record for second half of year
                        var newRec1 = THIS.createBillingCountRec({
                            start: start2,
                            end: new Date(
                                newCountFields["custrecordzab_cd_end_date"]
                            ),
                            count: newCd,
                            sub: sub
                        });
                        //var end1 = new Date(newCountFields['custrecordzab_cd_end_date']);
                        //var end1 = end1.setMonth(end1.getMonth() - 6);
                        //end1 = new Date(end1);

                        start2.setDate(start2.getDate() - 1);
                        var newRec2 = THIS.createBillingCountRec({
                            start: new Date(
                                newCountFields[
                                    "custrecordzab_cd_effective_date"
                                ]
                            ),
                            end: new Date(start2),
                            count: newCd,
                            sub: sub
                        });
                    } else {
                        //Effective date is after end date less 6  months

                        //add 1 day
                        start2.setDate(start2.getDate() + 1);
                        start2 = new Date(start2);

                        var newRec = THIS.createBillingCountRec({
                            start: start2,
                            end: new Date(
                                newCountFields["custrecordzab_cd_end_date"]
                            ),
                            count: newCd,
                            sub: sub
                        });
                    }
                }); //end for each
            } catch (e) {
                log.error({
                    title: "Error creating biannual charges",
                    details: e
                });
            }
        },

        /**
         * GTG
         * @param newCountRecs {object[]}
         */
        quarterlyChargesMoment: function (newCountRecs) {
            //declare this constants
            const THIS = this;
            const COUNT = THIS.RECORD_TYPE.ZAB_COUNT;

            _.forEach(newCountRecs, function (newCd) {
                //get end date of new count record
                var newCountFields = search.lookupFields({
                    type: COUNT.ID,
                    id: newCd,
                    columns: [
                        "custrecordzab_cd_end_date",
                        "custrecordzab_cd_effective_date",
                        "custrecordzab_cd_subscription"
                    ]
                });
                const sub =
                    newCountFields.custrecordzab_cd_subscription[0].value;
                //get existing end and effective date
                const endOriginal = moment(
                    new Date(newCountFields["custrecordzab_cd_end_date"])
                );
                const effectiveOriginal = moment(
                    new Date(newCountFields["custrecordzab_cd_effective_date"])
                );

                const months = endOriginal.diff(effectiveOriginal, "months");
                log.debug({
                    title: "Months Between",
                    details: months
                });

                if (months >= 9) {
                    //Create 4 Count Recs

                    var end1 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    end1.add(-9, "months");

                    //create Q1
                    var q1 = THIS.createBillingCountRec({
                        start: new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        ),
                        end: new Date(end1),
                        count: newCd,
                        sub: sub
                    });

                    //q2
                    var start2 = end1.add(1, "days");
                    start2 = new Date(start2);

                    var end2 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    end2.add(-6, "months");

                    //create q2
                    var q2 = THIS.createBillingCountRec({
                        start: new Date(start2),
                        end: new Date(end2),
                        sub: sub,
                        count: newCd
                    });

                    //q3
                    var start3 = end2.add(1, "days");

                    var end3 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    end3.add(-3, "months");

                    //create q3
                    var q3 = THIS.createBillingCountRec({
                        start: new Date(start3),
                        end: new Date(end3),
                        count: newCd,
                        sub: sub
                    });

                    //q4
                    var start4 = end3.add(1, "days");
                    //create q4
                    var q4 = THIS.createBillingCountRec({
                        start: new Date(start4),
                        end: new Date(
                            newCountFields["custrecordzab_cd_end_date"]
                        ),
                        count: newCd,
                        sub: sub
                    });
                } else if (months < 9 && months >= 6) {
                    //create 3 Recs

                    //No q1 rec

                    //q2
                    var end1 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    //subtract 9 months
                    end1.add(-6, "months");
                    //create q2
                    var q2 = THIS.createBillingCountRec({
                        start: new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        ),
                        end: new Date(end1),
                        count: newCd,
                        sub: sub
                    });

                    //q3
                    var start2 = end1.add(1, "days");

                    var end2 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    end2.add(-3, "months");
                    //create q3
                    var q3 = THIS.createBillingCountRec({
                        start: new Date(start2),
                        end: new Date(end2),
                        sub: sub,
                        count: newCd
                    });

                    //q4
                    var start3 = end2.add(1, "days");
                    //create q4
                    var q4 = THIS.createBillingCountRec({
                        start: new Date(start3),
                        end: new Date(
                            newCountFields["custrecordzab_cd_end_date"]
                        ),
                        count: newCd,
                        sub: sub
                    });
                } else if (months < 6 && months >= 3) {
                    //create 2 Recs

                    //No q1 Rec

                    //No q2 Rec

                    //q3
                    var end1 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    //subtract 9 months
                    end1.add(-3, "months");
                    //create q3
                    var q3 = THIS.createBillingCountRec({
                        start: new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        ),
                        end: new Date(end1),
                        count: newCd,
                        sub: sub
                    });

                    //q4
                    var start2 = end1.add(1, "days");
                    //create q4
                    var q4 = THIS.createBillingCountRec({
                        start: new Date(start2),
                        end: new Date(
                            newCountFields["custrecordzab_cd_end_date"]
                        ),
                        count: newCd,
                        sub: sub
                    });
                } else {
                    //create one rec
                    var q4 = THIS.createBillingCountRec({
                        end: new Date(
                            newCountFields["custrecordzab_cd_end_date"]
                        ),
                        start: new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        ),
                        count: newCd,
                        sub: sub
                    });
                }
            });
        },
        /**
         *GTG
         * @param newCountRecords {object[]}
         */
        biannualChargesMoment: function (newCountRecords) {
            try {
                const COUNT = this.RECORD_TYPE.ZAB_COUNT;
                const THIS = this;

                _.forEach(newCountRecords, function (newCd) {
                    //get end date of new count record
                    var newCountFields = search.lookupFields({
                        type: COUNT.ID,
                        id: newCd,
                        columns: [
                            "custrecordzab_cd_end_date",
                            "custrecordzab_cd_effective_date",
                            "custrecordzab_cd_subscription"
                        ]
                    });

                    //get existing end date
                    var endOriginal = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    var effectiveOriginal = moment(
                        new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        )
                    );
                    var sub =
                        newCountFields.custrecordzab_cd_subscription[0].value;

                    const months = endOriginal.diff(
                        effectiveOriginal,
                        "months"
                    );
                    log.debug({
                        title: "Months Between",
                        details: months
                    });

                    if (months >= 5) {
                        //effective date is before end date less 6 months

                        //calculate end date for first rec
                        //effective date = original
                        //get original end
                        var end1 = moment(
                            new Date(
                                newCountFields["custrecordzab_cd_end_date"]
                            )
                        );
                        end1.add(-6, "months");
                        var newRec1 = THIS.createBillingCountRec({
                            start: new Date(
                                newCountFields[
                                    "custrecordzab_cd_effective_date"
                                ]
                            ),
                            end: new Date(end1),
                            count: newCd,
                            sub: sub
                        });

                        //add one to first end date to get start
                        var start2 = end1.add(1, "days");
                        var newRec2 = THIS.createBillingCountRec({
                            start: new Date(start2),
                            end: new Date(
                                newCountFields["custrecordzab_cd_end_date"]
                            ),
                            sub: sub,
                            count: newCd
                        });
                    } else {
                        //Effective date is after end date less 6  months

                        var newRec = THIS.createBillingCountRec({
                            start: new Date(
                                newCountFields[
                                    "custrecordzab_cd_effective_date"
                                ]
                            ),
                            end: new Date(
                                newCountFields["custrecordzab_cd_end_date"]
                            ),
                            count: newCd,
                            sub: sub
                        });
                    }
                }); //end for each
            } catch (e) {
                log.error({
                    title: "Error creating biannual charges",
                    details: e
                });
            }
        }
    };
}); //end
