/**
 * This custom plugin is called during the ZAB Create Transaction Process.
 * Here are the Supported functions and when they trigger:
 *
 * 1. executePreTransactionCreation
 * 2. executePostTransactionCreation
 * 3. executePostChargesUpdated
 *
 * @NApiVersion 2.x
 * @NScriptType plugintypeimpl
 */
define([
    "N/record",
    "N/search",
    "N/plugin",
    "./Lib/lodash.min",
    "./Lib/_scg_zab_lib.js"
], function (record, search, plugin, _, ZAB_CONSTANTS) {
    /**
     * Plug-In Function that allows a custom process to be triggered
     * directly before the a transaction is created from a ZAB Subscription
     *
     * @param {Object} dataIn
     * @param {SubscriptionCharge[]} dataIn.subscriptionCharges - Array of all charges used for this transaction
     *
     * @returns {void}
     */
    function executePreTransactionCreation(dataIn) {}

    /**
     * Plug-In Function that allows a custom process to be triggered
     * directly after the a transaction is created from a ZAB Subscription
     *
     * @param {Object} dataIn
     * @param {String} dataIn.transactionId - NetSuite Transaction ID
     * @param {Object} dataIn.lineCharges
     *** @key {Object} dataIn.lineCharges - The Line ID for the charges
     *** @value {SubscriptionCharge[]} dataIn.lineCharges - An array of Objects, resembling ZAB Charges, with information regarding
     *  teh charge corresponding to that line
     *
     * @returns {void}
     *
     */
    function executePostTransactionCreation(dataIn) {
        log.debug({
            title: "executePostTransactionCreation Executed",
            details: dataIn
        });

        try {
        } catch (e) {
            //end try
            log.error({
                title: "executePostTransactionCreation: error",
                details: e
            });
        } finally {
            //end catch
            log.debug({
                title: "executePostTransactionCreation Complete",
                details: dataIn
            });
        } //end finally
    } //post creation check

    /**
     * Plug-In Function that allows a custom process to be triggered
     * directly after the ZAB charges related to a specific subscription's transaction are updated.
     * Creates a CSV file or PDF attachment for usage detail reports
     *
     *
     *
     * @param {Object} dataIn
     * @param {String|null} dataIn.transactionId - The Transaction ID that was just created, if one was created
     * @param {String[]} dataIn.chargeIds - Array of Charge Ids that were just updated for the transaction.
     *
     * @returns {void}
     *
     */
    function executePostChargesUpdated(dataIn) {
        log.debug({
            title: "executePostChargesUpdated Executed",
            details: dataIn
        });

        try {
            if (dataIn.transactionId) {
                var tranType = ZAB_CONSTANTS.getTransactionType(
                    dataIn.transactionId
                );

                var tran = record.load({
                    type: tranType,
                    id: dataIn.transactionId
                });

                var usageNeed = tran.getValue({
                    fieldId:
                        ZAB_CONSTANTS.RECORD_TYPE.NS_TRANSACTION.Body_Field
                            .USAGE_NEED
                });
                var subsidiary = tran.getValue({
                    fieldId: "subsidiary"
                });
                log.debug({
                    title: "UsageType",
                    details: usageNeed
                });
                if (
                    usageNeed ===
                    ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.CALLMAX
                ) {
                    record.submitFields({
                        type: tranType,
                        id: dataIn.transactionId,
                        values: {
                            location: 205
                        }
                    });
                }
            }

            //Get  Charges in run
            if (dataIn.chargeIds.length && dataIn.transactionId && usageNeed) {
                //screenings
                if (
                    usageNeed ==
                        ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RHR ||
                    usageNeed ==
                        ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RESCHECK
                ) {
                    var screenCharges = getScreenCharges(dataIn);
                    if (screenCharges.length) {
                        log.debug({
                            title: "Logging Usage",
                            details: dataIn.transactionId
                        });
                        var usageString = createScreenUsageString(
                            screenCharges,
                            dataIn.transactionId
                        );
                        var fileId = screeningCSV(
                            screenCharges,
                            dataIn.transactionId
                        );

                        log.debug({
                            title: "Update TranID: " + dataIn.transactionId,
                            details: usageString
                        });
                        if (usageString.length) {
                            /*
                                reset location on header of transactions
                                 */
                            if (
                                usageNeed ==
                                ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES
                                    .RESCHECK
                            ) {
                                record.attach({
                                    record: {
                                        type: "file",
                                        id: fileId
                                    },
                                    to: {
                                        type: tranType,
                                        id: dataIn.transactionId
                                    }
                                });
                                record.submitFields({
                                    type: tranType,
                                    id: dataIn.transactionId,
                                    values: {
                                        custbody_scg_stringify_usage:
                                            usageString,
                                        custbody_scg_usage_file_attach: fileId
                                    }
                                });
                            } else if (
                                usageNeed ==
                                ZAB_CONSTANTS.RECORD_TYPE.USAGE_TYPE.VALUES.RHR
                            ) {
                                if (subsidiary == 2) {
                                    if (tranType === record.Type.CREDIT_MEMO) {
                                        record.attach({
                                            record: {
                                                type: "file",
                                                id: fileId
                                            },
                                            to: {
                                                type: tranType,
                                                id: dataIn.transactionId
                                            }
                                        });
                                        record.submitFields({
                                            type: tranType,
                                            id: dataIn.transactionId,
                                            values: {
                                                custbody_scg_stringify_usage:
                                                    usageString,
                                                custbody_scg_usage_file_attach:
                                                    fileId,
                                                location: 6,
                                                custbody_scg_credit_reason: 8
                                            }
                                        });
                                    } else {
                                        record.attach({
                                            record: {
                                                type: "file",
                                                id: fileId
                                            },
                                            to: {
                                                type: tranType,
                                                id: dataIn.transactionId
                                            }
                                        });
                                        record.submitFields({
                                            type: tranType,
                                            id: dataIn.transactionId,
                                            values: {
                                                custbody_scg_stringify_usage:
                                                    usageString,
                                                custbody_scg_usage_file_attach:
                                                    fileId,
                                                location: 6
                                            }
                                        });
                                    }
                                } else if (subsidiary == 6) {
                                    record.attach({
                                        record: {
                                            type: "file",
                                            id: fileId
                                        },
                                        to: {
                                            type: tranType,
                                            id: dataIn.transactionId
                                        }
                                    });
                                    record.submitFields({
                                        type: tranType,
                                        id: dataIn.transactionId,
                                        values: {
                                            custbody_scg_stringify_usage:
                                                usageString,
                                            custbody_scg_usage_file_attach:
                                                fileId,
                                            location: 6
                                        }
                                    });
                                }
                            }
                        } else {
                            log.debug({
                                title: "Not screening",
                                details: dataIn.transactionId
                            });
                        }

                        //Insurance
                    }
                } else if (usageNeed == 3) {
                    var insuranceCharges = getInsuranceCharges(dataIn);
                    if (insuranceCharges.length) {
                        log.debug({
                            title: "Logging Insurance Usage",
                            details: dataIn.transactionId
                        });
                        var fileId = createUsageFile(dataIn, insuranceCharges);
                        if (fileId) {
                            record.attach({
                                record: {
                                    type: "file",
                                    id: fileId
                                },
                                to: {
                                    type: tranType,
                                    id: dataIn.transactionId
                                }
                            });

                            record.submitFields({
                                type: tranType,
                                id: dataIn.transactionId,
                                values: {
                                    custbody_scg_usage_file_attach: fileId
                                }
                            });
                        }
                    }
                }
            } //end if
        } catch (e) {
            //end try
            log.error({
                title: "executePostChargesUpdated: error",
                details: e
            });
        } finally {
            //end catch
            log.debug({
                title: "executePostChargesUpdated Complete",
                details: dataIn
            });
        } //end finally
    }

    /**
     * Functions
     *
     */
    /**
     *
     * @param dataIn
     * @returns {screenCharges[]}
     */
    function getScreenCharges(dataIn) {
        log.debug({
            title: "getScreenCharges: start",
            details: dataIn
        });
        var screenCharges = [];
        var filters = [];
        var columns = [];

        filters.push(
            search.createFilter({
                name: "internalid",
                operator: search.Operator.ANYOF,
                values: dataIn.chargeIds
            })
        );

        try {
            var chargeDataSearch;
            chargeDataSearch = search
                .create({
                    type: ZAB_CONSTANTS.RECORD_TYPE.ZAB_CHARGE.ID,
                    filters: filters,
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
                         */
                        screenCharges.push({
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
                            })
                        }); //pushed
                    }); //end fetch
            }); //end pageRanges
        } catch (e) {
            //end try
            log.error({
                title: "Error: getScreenCharges",
                details: e
            });
        } //end catch

        log.debug({
            title: "getApplicableCharges: end",
            details: screenCharges
        });

        return screenCharges;
    } //end get charges

    /**
     *Creates CSV file of screening usage
     * Uses library for creating CSV
     *
     * @param screenCharges
     * @param tranId
     * @returns {string} fileId
     */
    function screeningCSV(screenCharges, tranId) {
        try {
            var filters = [];
            _.each(
                _.groupBy(screenCharges, "clientId"),
                function (scharges, clientId) {
                    //add OR filter logic if not the first run
                    if (filters.length > 0) {
                        filters.push("OR");
                    }
                    var dateFilters = [];

                    _.each(scharges, function (scharge) {
                        if (dateFilters.length > 0) {
                            dateFilters.push("OR");
                        }
                        dateFilters.push([
                            [
                                "custrecord_scg_main_date",
                                search.Operator.ONORAFTER,
                                scharge.start_date
                            ],
                            "AND",
                            [
                                "custrecord_scg_main_date",
                                search.Operator.ONORBEFORE,
                                scharge.end_date
                            ]
                        ]);
                    });
                    filters.push([
                        [
                            "custrecord_scg_client_id",
                            search.Operator.IS,
                            clientId
                        ],
                        "AND",
                        dateFilters
                    ]);
                } //end each function
            ); //end each

            var screenSearch = search.load({
                id: "customsearch_scg_file_of_screens"
            });
            var f = screenSearch.filters;
            //    for(var j; j < filters.length; j++){
            //      f.push(filters[j]);
            //};
            log.debug({
                title: "screeningCSV",
                details: filters
            });

            var screenSearchN = search.create({
                type: ZAB_CONSTANTS.RECORD_TYPE.MRI_SCREENING.ID,
                columns: screenSearch.columns,
                filters: filters
            });

            var fileId = ZAB_CONSTANTS.createCSVFile3(tranId, screenSearchN);
            // ZAB_CONSTANTS.createPDFScreening(tranId, screenSearchN);

            return fileId;
        } catch (e) {
            log.error({
                title: "Error Creating Screening File",
                details: e
            });
        }
    }

    /**
     * Creates String of Usage Details
     * No lib functions
     * @param {screenCharges[]} screenCharges
     *
     *
     * @param {String} tranId
     * @return {string} usageString
     */
    function createScreenUsageString(screenCharges, tranId) {
        try {
            log.debug({
                title: "setTransaction: start",
                details: screenCharges
            });

            //initialize screens
            //    var usageString = 'No screens found';

            if (screenCharges.length) {
                var columns = [];

                columns.push(
                    search.createColumn({
                        name: "internalid"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_client_id"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_prod"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_main_date"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord_scg_app_name"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord9"
                    })
                );
                columns.push(
                    search.createColumn({
                        name: "custrecord10"
                    })
                );

                var filters = [];
                _.each(
                    _.groupBy(screenCharges, "clientId"),
                    function (scharges, clientId) {
                        //add OR filter logic if not the first run
                        if (filters.length > 0) {
                            filters.push("OR");
                        }
                        var dateFilters = [];

                        _.each(scharges, function (scharge) {
                            if (dateFilters.length > 0) {
                                dateFilters.push("OR");
                            }
                            dateFilters.push([
                                [
                                    "custrecord_scg_main_date",
                                    search.Operator.ONORAFTER,
                                    scharge.start_date
                                ],
                                "AND",
                                [
                                    "custrecord_scg_main_date",
                                    search.Operator.ONORBEFORE,
                                    scharge.end_date
                                ]
                            ]);
                        });
                        filters.push([
                            [
                                "custrecord_scg_client_id",
                                search.Operator.IS,
                                clientId
                            ],
                            "AND",
                            dateFilters
                        ]);
                    } //end each function
                ); //end each
                log.debug({
                    title: "setTransaction: filters",
                    details: filters
                });

                const PAGED_DATA = search
                    .create({
                        type: "customrecord_scg_mri_screening",
                        columns: columns,
                        filters: filters
                    })
                    .runPaged({ pageSize: 1000 });

                var screens = [];
                log.debug({
                    title: "Transaction to tag",
                    details: tranId
                });
                var screenUsage = [];
                PAGED_DATA.pageRanges.forEach(function (pageRange) {
                    PAGED_DATA.fetch({ index: pageRange.index }).data.forEach(
                        function (result) {
                            var screenId = result.getValue(columns[0]);
                            log.debug({
                                title: "Screen to update",
                                details: screenId
                            });
                            //   var screen = record.load({
                            //      type: "customrecord_scg_mri_screening",
                            //    id: screenId,
                            //     isDynamic: true
                            //});
                            //removed 3/9
                            //screen.setValue({
                            //  fieldId: 'custrecord_scg_attach_screen',
                            //value: tranId
                            //});

                            //stringify
                            var appName = result.getValue(columns[4]);
                            var date = result.getValue(columns[5]);
                            var cost = result.getValue(columns[6]);

                            var description = String(
                                appName + "@" + date + "@" + cost
                            );
                            screenUsage.push(description);

                            //screen.save();
                            screens.push(screenId);
                        } //end submit field
                    );
                }); //end page run
            } //end if
            //Create Array String
            if (screenUsage.length) {
                var usageString = screenUsage.join("|");
            }
        } catch (e) {
            //end try
            log.error({
                title: "setTransaction: error",
                details: e
            });
        } finally {
            //end catch
            log.debug({
                title: "setTransaction: end",
                details: screens
            });
            return usageString;
        }
    } //end set transactions

    /**
     * @description Get all Charges related to insurance
     * @param dataIn
     * @param {string} dataIn.transactionId
     * @param {string[]} dataIn.chargeIds
     *
     * @returns {insuranceCharges[]}
     */
    function getInsuranceCharges(dataIn) {
        log.debug({
            title: "getInsuranceCharges: start",
            details: dataIn
        });
        var insuranceCharges = [];

        try {
            insuranceCharges = ZAB_CONSTANTS.chargeDataSearch(
                dataIn,
                insuranceCharges
            );

            return insuranceCharges;
        } catch (e) {
            log.error({
                title: "Error in getInsuranceCharges",
                details: e
            });
        }
    }

    /**
     *
     * @param dataIn
     * @param {string} dataIn.transactionId
     * @param {string[]} dataIn.chargeIds
     *
     * @param insuranceCharges
     * @returns {*|string|number|void}
     *
     */
    function createUsageFile(dataIn, insuranceCharges) {
        log.debug({
            title: "createUsageFile: Start",
            details: insuranceCharges
        });
        try {
            var filters = [];
            _.each(
                _.groupBy(insuranceCharges, "customer"),
                function (scharges, clientId) {
                    //add OR filter logic if not the first run
                    if (filters.length > 0) {
                        filters.push("OR");
                    }
                    var dateFilters = [];

                    _.each(scharges, function (scharge) {
                        if (dateFilters.length > 0) {
                            dateFilters.push("OR");
                        }
                        dateFilters.push([
                            [
                                ZAB_CONSTANTS.RECORD_TYPE.MRI_INSURANCE.Field
                                    .SERVICE_DATE,
                                search.Operator.ONORAFTER,
                                scharge.start_date
                            ],
                            "AND",
                            [
                                ZAB_CONSTANTS.RECORD_TYPE.MRI_INSURANCE.Field
                                    .SERVICE_DATE,
                                search.Operator.ONORBEFORE,
                                scharge.end_date
                            ]
                        ]);
                    });
                    filters.push([
                        [
                            ZAB_CONSTANTS.RECORD_TYPE.MRI_INSURANCE.Field
                                .CUSTOMER,
                            search.Operator.ANYOF,
                            clientId
                        ],
                        "AND",
                        dateFilters
                    ]);
                } //end each function
            ); //end each
            log.debug({
                title: "setTransaction: filters",
                details: filters
            });
            var iSearch = search.load({
                id: "customsearch_scg_for_file"
            });
            var f = iSearch.filters;
            for (var i; i < filters.length; i++) {
                f.push(filters[i]);
            }

            var newFile = ZAB_CONSTANTS.createCSVFile2(dataIn, iSearch);

            return newFile;
        } catch (e) {
            log.error({
                title: "Error in createUsageFIle",
                details: e
            });
        }
    }

    return {
        executePreTransactionCreation: executePreTransactionCreation,
        executePostTransactionCreation: executePostTransactionCreation,
        executePostChargesUpdated: executePostChargesUpdated
    };
});
