<template>
    <div id="DownloadStatusBarTooltip" class="dsb-tooltip" v-if="tooltipShown" :style="{left: left}"
         @mouseleave="hideTooltip"
         :ref="'tooltip'">
        <table class="dsb-tooltip-table">
            <tr class="dsb-tooltip-table-row">
                <th class="dsb-tooltip-heading">{{ l('tooltipFilenameHeading') }}:</th>
                <td class="dsb-tooltip-cell"><input class="dsb-tooltip-url" type="url" :value="filename" readonly></td>
            </tr>
            <tr class="dsb-tooltip-table-row">
                <th class="dsb-tooltip-heading">{{ l('tooltipUrlHeading') }}:</th>
                <td class="dsb-tooltip-cell"><input class="dsb-tooltip-url" type="url" :value="download.downloadItem.url" readonly></td>
            </tr>
            <tr class="dsb-tooltip-table-row">
                <th class="dsb-tooltip-heading">{{ l('tooltipReferrerHeading') }}:</th>
                <td class="dsb-tooltip-cell">
                    <input v-if="download.downloadItem.referrer" class="dsb-tooltip-url" type="url" :value="download.downloadItem.referrer"
                           readonly>
                    <span v-else>{{ l('tooltipReferrerNone') }}</span>
                </td>
            </tr>
            <tr class="dsb-tooltip-table-row">
                <th class="dsb-tooltip-heading">{{ l('tooltipSpeedHeading') }}:</th>
                <td class="dsb-tooltip-cell">{{ downloadSpeed }}</td>
            </tr>
            <tr class="dsb-tooltip-table-row">
                <th class="dsb-tooltip-heading">{{ l('tooltipStatusHeading') }}:</th>
                <td class="dsb-tooltip-cell">{{ status }}</td>
            </tr>
            <tr v-if="download.downloadItem.state !== 'complete'">
                <th class="dsb-tooltip-heading">{{ l('tooltipProgressHeading') }}:</th>
                <td class="dsb-tooltip-cell">{{ progress }}</td>
            </tr>
            <tr v-else>
                <th class="dsb-tooltip-heading">{{ l('tooltipFilesizeHeading') }}:</th>
                <td class="dsb-tooltip-cell">{{ filesize }}</td>
            </tr>
            <tr class="dsb-tooltip-table-row">
                <th class="dsb-tooltip-heading">{{ l('tooltipMimeHeading') }}:</th>
                <td class="dsb-tooltip-cell">{{ download.downloadItem.mime || l('tooltipMimeUnknown') }}</td>
            </tr>
            <tr v-if="isImage">
                <th class="dsb-tooltip-heading">{{ l('tooltipPreviewHeading') }}:</th>
                <td class="dsb-tooltip-cell"><img class="dsb-preview" :src="download.downloadItem.url"></td>
            </tr>
        </table>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import events from './events';
    import * as helpers from '../helpers';
    import {Component, Prop} from 'vue-property-decorator';

    @Component({})
    export default class Tooltip extends Vue {
        @Prop({})
        theme: String;

        static tag = 'tooltip';
        downloadId: number | null = null;
        element: HTMLElement | null = null;
        tooltipShown = false;
        left = '0';

        get download() {
            return this.$store.getters.getDownload(this.downloadId);
        }

        get filename(): string {
            return this.download!.downloadItem.filename;
        }

        get status(): string {
            return this.download!.status();
        }

        get progress(): string {
            return this.download!.progress();
        }

        get downloaded(): string {
            return helpers.formatFileSize(this.download!.downloadItem.bytesReceived);
        }

        get totalsize(): string {
            return helpers.formatFileSize(this.download!.downloadItem.totalBytes);
        }

        get filesize(): string {
            return helpers.formatFileSize(this.download!.downloadItem.fileSize);
        }

        get percentDone(): number {
            return this.download!.percentDownloaded();
        }

        get isImage(): boolean {
            if (!this.download) {
                return false;
            }

            return this.download.isImage();
        }

        get downloadSpeed(): string {
            if (!this.download) {
                return helpers.localize('downloadSpeedUnknown');
            }

            return `${helpers.formatFileSize(this.download.calculateDownloadSpeed())}/s`;
        }

        l(messageName: string, substitutions?: string | string[]): string {
            return helpers.localize(messageName, substitutions);
        }

        calculateLeftPosition(): string {
            if (this.element) {
                let downloadOffset = this.element.offsetLeft;

                if (downloadOffset + this.$el.offsetWidth > window.innerWidth) {
                    return `${window.innerWidth - this.$el.offsetWidth}px`;
                } else {
                    return `${downloadOffset}px`;
                }
            }

            return '0';
        }

        updated() {
            this.left = this.calculateLeftPosition();
        }

        mounted() {
            events.$on('showTooltip', (downloadId: number, element: HTMLElement) => {
                this.tooltipShown = true;
                this.downloadId = downloadId;
                this.element = element;
            });

            events.$on('hideTooltip', () => {
                this.tooltipShown = false;
            });
        }
    }
</script>

<style lang="scss">
    @import "../scss/variables";
    @import "../scss/mixins";

    #DownloadStatusBarTooltip {
        background : var(--background);
        border     : 1px solid var(--border);
        bottom     : 100%;
        color      : var(--text);
        cursor     : default;
        left       : 0;
        margin     : 0;
        max-width  : 100%;
        min-width  : 300px;
        overflow   : hidden;
        padding    : 10px;
        position   : absolute;
        width      : auto;
        z-index    : 10;

        .dsb-tooltip-table {
            border    : 0;
            max-width : 100%;
        }

        .dsb-tooltip-table-row {
            + .dsb-tooltip-table-row {
                .dsb-tooltip-heading, .dsb-tooltip-cell { padding-top : 5px }
            }
        }

        .dsb-tooltip-heading, .dsb-tooltip-cell {
            background      : var(--background);
            border-collapse : collapse;
            color           : var(--text);
            font-size       : 14px;
            line-height     : 1.2;
        }

        .dsb-tooltip-cell {
            overflow      : hidden;
            padding-left  : 5px;
            text-align    : left;
            text-overflow : ellipsis;
            word-break    : break-all;
        }

        .dsb-tooltip-heading {
            font-weight    : bold;
            text-align     : right;
            vertical-align : top;
            white-space    : nowrap;
        }

        .dsb-tooltip-url {
            background  : rgba(0, 0, 0, 0.2);
            border      : 1px solid var(--border);
            color       : var(--text);
            line-height : 1;
            max-width   : 500px;
            min-width   : 250px;
            padding     : 5px 5px;
            width       : 100%;
        }

        .dsb-preview {
            height     : auto;
            max-height : 200px;
            max-width  : 300px;
            width      : auto;
        }
    }
</style>