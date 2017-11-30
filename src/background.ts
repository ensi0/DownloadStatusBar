import DownloadItem = browser.downloads.DownloadItem;
import DownloadQuery = browser.downloads.DownloadQuery;
import * as helpers from './helpers';
import {Options} from './options';

class DownloadStatus {
    protected downloads: DownloadItem[] = [];
    protected interval: number | null;
    protected options: Options;

    constructor() {
        const self = this;

        browser.storage.sync.get(null)
            .then((options) => {
                this.options = options;
            });

        browser.storage.onChanged.addListener((changedOptions) => {
            for (let item of Object.keys(changedOptions)) {
                this.options[item] = changedOptions[item].newValue;
            }
        });

        browser.downloads.onCreated.addListener(function (download) {
            self.downloads.push(download);
            self.startInterval();
        });

        browser.downloads.onChanged.addListener((download) => {
            if (download.state && download.state.current === 'complete') {
                if (this.options.autohideEnable && this.options.autohideDuration) {
                    setTimeout(() => {
                        self.clearDownload(download);
                    }, this.options.autohideDuration * 1000);
                }
            } else {
                self.startInterval();
            }
        });

        browser.runtime.onMessage.addListener(function (request: any, sender: any, sendResponse: any) {
            if (request.event === 'clearDownloads') {
                self.downloads = helpers.filterCompletedDownloads(self.downloads);
                self.refresh();
            } else if (request.event === 'clearDownload') {
                self.clearDownload(request.download);
            } else if (request.event === 'showDownload') {
                self.showDownload(request.download);
            } else if (request.event === 'cancelDownload') {
                self.cancelDownload(request.download);
            } else if (request.event === 'pauseDownload') {
                self.pauseDownload(request.download);
            } else if (request.event === 'resumeDownload') {
                self.resumeDownload(request.download);
            } else if (request.event === 'deleteDownload') {
                self.deleteDownload(request.download);
            }
        });

        // Send the downloads to a tab when it loads
        browser.webNavigation.onCompleted.addListener(function (arg: any) {
            browser.tabs.sendMessage(arg.tabId, self.downloads);
        });
    }

    /**
     * Refresh the downloads and tabs
     */
    refresh() {
        this.updateDownloads().then((downloads: DownloadItem[]) => {
            this.downloads = downloads;
            this.updateTabs(downloads);

            // If there are no downloads in progress stop the interval
            if (helpers.getInProgressDownloads(downloads).length <= 0) {
                this.stopInterval();
            }
        });
    }

    /**
     * Start an interval to keep the in progress downloads updated
     */
    startInterval() {
        if (this.interval) {
            return;
        }

        this.interval = setInterval(() => {
            this.refresh();
        }, 1000);
    }

    /**
     * Stop the interval
     */
    stopInterval() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    onError(error: Error) {
        console.log(`Error: ${error}`);
    }

    /**
     * Update the browser tabs with the state of the downloads
     *
     * @param {browser.downloads.DownloadItem[]} downloads
     * @returns {Promise<void>}
     */
    updateTabs(downloads: DownloadItem[]) {
        let querying = browser.tabs.query({});

        return querying.then((tabs) => {
            for (let tab of tabs) {
                if (tab.id) {
                    browser.tabs.sendMessage(tab.id, downloads);
                }
            }
        });
    };

    /**
     * Update the state of the currently managed downloads
     *
     * @returns {Promise<browser.downloads.DownloadItem[]>}
     */
    updateDownloads(): Promise<DownloadItem[]> {
        let query: DownloadQuery = {};

        let promises = [];

        for (let download of this.downloads) {
            let promise = new Promise<DownloadItem>((resolve, reject) => {
                query.id = download.id;

                let searching = browser.downloads.search(query);

                searching.then((downloads) => {
                    resolve(downloads[0]);
                }, (error) => {
                    this.onError(error);
                    reject();
                });
            });

            promises.push(promise);
        }

        return Promise.all(promises);
    }

    /**
     * Clear a download from the status bar
     * @param {{id: number}} download
     */
    clearDownload(download: { id: number }) {
        this.downloads = helpers.removeSelectedDownload(download, this.downloads);
        this.refresh();
    }

    /**
     * Show a download in explorer/finder
     *
     * @param {browser.downloads.DownloadItem} download
     */
    showDownload(download: DownloadItem) {
        browser.downloads.show(download.id);
    }

    /**
     * Cancel a download
     *
     * @param {browser.downloads.DownloadItem} download
     */
    cancelDownload(download: DownloadItem) {
        browser.downloads.cancel(download.id).then(() => {
            this.refresh();
        });
    }

    /**
     * Pause a running download
     *
     * @param {browser.downloads.DownloadItem} download
     */
    pauseDownload(download: DownloadItem) {
        browser.downloads.pause(download.id).then(() => {
            this.refresh();
        });
    }

    /**
     * Resume a paused download
     *
     * @param {browser.downloads.DownloadItem} download
     */
    resumeDownload(download: DownloadItem) {
        browser.downloads.resume(download.id).then(() => {
            this.refresh();
        });
    }

    /**
     * Delete a download file
     *
     * @param {browser.downloads.DownloadItem} download
     */
    deleteDownload(download: DownloadItem) {
        browser.downloads.removeFile(download.id).then(() => {
            this.downloads = helpers.removeSelectedDownload(download, this.downloads);
            this.updateTabs(this.downloads);
        });
    }
}

let downloadStatus = new DownloadStatus();