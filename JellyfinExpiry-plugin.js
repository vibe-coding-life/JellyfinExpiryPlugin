"use strict";

window.JellyfinExpiryWebPlugin = async function () {
    return class JellyfinExpiryWebPlugin {
        constructor(services) {
            this.name = "Jellyfin Expiry";
            this.id = "jellyfinexpiry";
            this.type = "jellyfinexpiry";
            this.priority = 0;
            this.services = services;

            this.menuRequest = 0;
            this.scheduleCache = [];
            this.bannerRefreshTimer = null;

            if (!window.__JellyfinExpiryWebInstance) {
                window.__JellyfinExpiryWebInstance = this;
                this.init();
            }

            console.log("[JellyfinExpiry] Web plugin instantiated");
        }

        init() {
            this.installStyles();

            document.addEventListener(
                "click",
                event => this.onDocumentClick(event),
                true
            );

            this.startExpiryBanners();

            console.log("[JellyfinExpiry] Movie menu hook enabled");
        }

        startExpiryBanners() {
            const refresh = () => {
                this.refreshExpiryBanners();
            };

            setTimeout(refresh, 1200);

            this.bannerRefreshTimer =
                setInterval(refresh, 60000);

            const observer =
                new MutationObserver(() => {
                    clearTimeout(
                        this._bannerMutationTimer
                    );

                    this._bannerMutationTimer =
                        setTimeout(() => {
                            this.renderExpiryBanners();
                        }, 120);
                });

            const beginObserve = () => {
                if (!document.body) {
                    setTimeout(beginObserve, 100);
                    return;
                }

                observer.observe(
                    document.body,
                    {
                        childList: true,
                        subtree: true
                    }
                );
            };

            beginObserve();
        }

        async refreshExpiryBanners() {
            try {
                this.scheduleCache =
                    await this.loadSchedules();

                this.renderExpiryBanners();
            } catch (error) {
                const status =
                    error?.status ||
                    error?.statusCode ||
                    error?.response?.status;

                if (
                    status !== 401 &&
                    status !== 403
                ) {
                    console.debug(
                        "[JellyfinExpiry] Banner refresh failed",
                        error
                    );
                }
            }
        }

        renderExpiryBanners() {
            const schedules =
                new Map();

            for (const entry of this.scheduleCache || []) {
                const itemId =
                    entry.ItemId ??
                    entry.itemId;

                const expires =
                    entry.ExpiresAtUtc ??
                    entry.expiresAtUtc;

                if (itemId && expires) {
                    schedules.set(
                        this.normaliseId(itemId),
                        expires
                    );
                }
            }

            document
                .querySelectorAll(
                    '[data-type="Movie"][data-id]'
                )
                .forEach(card => {
                    const itemId =
                        this.normaliseId(
                            card.getAttribute(
                                "data-id"
                            )
                        );

                    const expires =
                        schedules.get(itemId);

                    const existing =
                        card.querySelector(
                            ".jellyfinExpiryCoverBanner"
                        );

                    const imageContainer =
                        card.querySelector(
                            ".cardImageContainer"
                        );

                    if (!imageContainer) {
                        return;
                    }

                    if (!expires) {
                        existing?.remove();
                        imageContainer.classList.remove(
                            "jellyfinExpiryHasBanner"
                        );
                        return;
                    }

                    imageContainer.classList.add(
                        "jellyfinExpiryHasBanner"
                    );

                    let banner = existing;

                    if (!banner) {
                        banner =
                            document.createElement(
                                "div"
                            );

                        banner.className =
                            "jellyfinExpiryCoverBanner";

                        imageContainer.appendChild(
                            banner
                        );
                    }

                    const expiryDate =
                        new Date(expires);

                    const ms =
                        expiryDate.getTime() -
                        Date.now();

                    const days =
                        Math.ceil(
                            ms / 86400000
                        );

                    if (days <= 0) {
                        banner.textContent =
                            "Expiry due";
                    } else if (days === 1) {
                        banner.textContent =
                            "Expires in 1 day";
                    } else {
                        banner.textContent =
                            `Expires in ${days} days`;
                    }

                    banner.title =
                        "Scheduled expiry: " +
                        expiryDate.toLocaleString();
                });
        }

        installStyles() {
            if (document.getElementById("jellyfinExpiryWebStyles")) {
                return;
            }

            const style = document.createElement("style");
            style.id = "jellyfinExpiryWebStyles";
            style.textContent = `
                .jellyfinExpiryPickerBackdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1em;
                    background: rgba(0, 0, 0, .72);
                }

                .jellyfinExpiryPicker {
                    width: min(24em, calc(100vw - 2em));
                    max-height: 90vh;
                    overflow: auto;
                    background: #202020;
                    color: rgba(255,255,255,.87);
                    border-radius: .35em;
                    box-shadow: 0 .5em 2.5em rgba(0,0,0,.65);
                }

                .jellyfinExpiryPickerTitle {
                    padding: 1em 1em .55em;
                    font-size: 1.35em;
                    font-weight: 500;
                }

                .jellyfinExpiryPickerChoices {
                    padding-bottom: .4em;
                }

                .jellyfinExpiryPickerCancel {
                    margin: .5em 1em 1em;
                    width: calc(100% - 2em);
                }

                .jellyfinExpiryDialogButtons {
                    display: flex;
                    gap: .8em;
                    margin-top: 1.35em;
                }

                .jellyfinExpiryDialogButton {
                    flex: 1;
                    min-height: 2.8em;
                    padding: .65em 1.15em;
                    border: 0;
                    border-radius: .3em;
                    font: inherit;
                    font-weight: 500;
                    cursor: pointer;
                    transition:
                        background-color .15s ease,
                        filter .15s ease,
                        transform .05s ease;
                }

                .jellyfinExpiryDialogButton:active {
                    transform: scale(.98);
                }

                .jellyfinExpiryDialogButtonSecondary {
                    background: rgba(255,255,255,.12);
                    color: rgba(255,255,255,.9);
                }

                .jellyfinExpiryDialogButtonSecondary:hover {
                    background: rgba(255,255,255,.18);
                }

                .jellyfinExpiryDialogButtonPrimary {
                    background: #00a4dc;
                    color: #fff;
                }

                .jellyfinExpiryDialogButtonPrimary:hover {
                    filter: brightness(1.12);
                }

                .cardImageContainer {
                    overflow: hidden;
                }

                .cardImageContainer.jellyfinExpiryHasBanner {
                    border-bottom-left-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                }

                .cardContent:has(.jellyfinExpiryCoverBanner) {
                    border-bottom-left-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                }

                .jellyfinExpiryCoverBanner {
                    position: absolute;
                    left: -1px;
                    right: -1px;
                    bottom: -1px;
                    width: calc(100% + 2px);
                    z-index: 4;
                    box-sizing: border-box;
                    padding: .38em .55em;
                    margin: 0;
                    border: 0;
                    border-radius: 0;
                    background: rgba(18,18,18,.88);
                    color: rgba(255,255,255,.95);
                    font-size: .82em;
                    font-weight: 500;
                    line-height: 1.25;
                    text-align: center;
                    pointer-events: none;
                    backdrop-filter: blur(3px);
                    -webkit-backdrop-filter: blur(3px);
                }

                .jellyfinExpiryToast {
                    position: fixed;
                    left: 50%;
                    bottom: 3em;
                    z-index: 1000000;
                    transform: translateX(-50%);
                    background: rgba(25,25,25,.96);
                    color: #fff;
                    padding: .8em 1.15em;
                    border-radius: .3em;
                    box-shadow: 0 .25em 1.2em rgba(0,0,0,.45);
                    pointer-events: none;
                }
            `;

            document.head.appendChild(style);
        }

        getApiClient() {
            const connections =
                this.services &&
                this.services.ServerConnections;

            if (
                connections &&
                typeof connections.currentApiClient === "function"
            ) {
                return connections.currentApiClient();
            }

            if (window.ApiClient) {
                return window.ApiClient;
            }

            return null;
        }

        normaliseId(value) {
            return String(value || "")
                .replace(/-/g, "")
                .toLowerCase();
        }

        async request(options) {
            const apiClient = this.getApiClient();

            if (!apiClient) {
                throw new Error("No active Jellyfin ApiClient");
            }

            return await Promise.resolve(
                apiClient.ajax(options)
            );
        }

        async loadSchedules() {
            const apiClient = this.getApiClient();

            if (!apiClient) {
                throw new Error("No active Jellyfin ApiClient");
            }

            const result = await this.request({
                type: "GET",
                url: apiClient.getUrl("JellyfinExpiry/Schedules"),
                dataType: "json"
            });

            if (Array.isArray(result)) {
                return result;
            }

            if (typeof result === "string") {
                const parsed = JSON.parse(result);
                return Array.isArray(parsed) ? parsed : [];
            }

            return [];
        }

        onDocumentClick(event) {
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const menuButton = target.closest("[data-action]");

            if (!menuButton) {
                return;
            }

            const action =
                menuButton.getAttribute("data-action") || "";

            if (action.toLowerCase() !== "menu") {
                return;
            }

            const itemElement =
                menuButton.closest("[data-id][data-type]");

            if (!itemElement) {
                return;
            }

            const type =
                itemElement.getAttribute("data-type") || "";

            if (type.toLowerCase() !== "movie") {
                return;
            }

            const itemId =
                itemElement.getAttribute("data-id");

            if (!itemId) {
                return;
            }

            const requestNumber = ++this.menuRequest;

            this.prepareMovieMenu(itemId, requestNumber);
        }

        async prepareMovieMenu(itemId, requestNumber) {
            let schedules;

            try {
                schedules = await this.loadSchedules();
            } catch (error) {
                const status =
                    error?.status ||
                    error?.statusCode ||
                    error?.response?.status;

                // Non-admins should simply never see the option.
                if (status !== 401 && status !== 403) {
                    console.debug(
                        "[JellyfinExpiry] Could not read schedules",
                        error
                    );
                }

                return;
            }

            if (requestNumber !== this.menuRequest) {
                return;
            }

            const scheduled = schedules.find(entry =>
                this.normaliseId(
                    entry.ItemId ?? entry.itemId
                ) === this.normaliseId(itemId)
            );

            const scroller =
                await this.waitForActionSheet(requestNumber);

            if (!scroller) {
                return;
            }

            this.injectExpiryMenuItem(
                scroller,
                itemId,
                scheduled
            );
        }

        async waitForActionSheet(requestNumber) {
            for (let attempt = 0; attempt < 60; attempt++) {
                if (requestNumber !== this.menuRequest) {
                    return null;
                }

                const scrollers = Array.from(
                    document.querySelectorAll(
                        ".actionSheetScroller"
                    )
                );

                const visible = scrollers
                    .reverse()
                    .find(element =>
                        element.getClientRects().length > 0 &&
                        !element.querySelector(
                            ".jellyfinExpiryMenuItem"
                        )
                    );

                if (visible) {
                    return visible;
                }

                await new Promise(resolve =>
                    setTimeout(resolve, 50)
                );
            }

            return null;
        }

        injectExpiryMenuItem(
            scroller,
            itemId,
            scheduled
        ) {
            if (
                scroller.querySelector(
                    ".jellyfinExpiryMenuItem"
                )
            ) {
                return;
            }

            const isScheduled = Boolean(scheduled);

            const button =
                document.createElement("button");

            button.setAttribute("is", "emby-button");
            button.setAttribute("type", "button");
            button.setAttribute(
                "data-id",
                isScheduled
                    ? "jellyfinexpiry-cancel"
                    : "jellyfinexpiry-schedule"
            );

            button.className =
                "listItem listItem-button actionSheetMenuItem jellyfinExpiryMenuItem";

            const icon =
                document.createElement("span");

            icon.className =
                "actionsheetMenuItemIcon listItemIcon listItemIcon-transparent material-icons " +
                (isScheduled ? "event_busy" : "schedule");

            icon.setAttribute("aria-hidden", "true");

            const body =
                document.createElement("div");

            body.className =
                "listItemBody actionsheetListItemBody";

            const text =
                document.createElement("div");

            text.className =
                "listItemBodyText actionSheetItemText";

            text.textContent = isScheduled
                ? "Cancel expiry"
                : "Schedule expiry";

            body.appendChild(text);

            if (isScheduled) {
                const expires =
                    scheduled.ExpiresAtUtc ??
                    scheduled.expiresAtUtc;

                if (expires) {
                    const secondary =
                        document.createElement("div");

                    secondary.className =
                        "listItemBodyText secondary";

                    const date = new Date(expires);

                    secondary.textContent =
                        "Scheduled for " +
                        date.toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short"
                        });

                    body.appendChild(secondary);
                }
            }

            button.appendChild(icon);
            button.appendChild(body);

            if (isScheduled) {
                button.addEventListener("click", () => {
                    this.cancelExpiry(itemId);
                });
            } else {
                button.addEventListener("click", () => {
                    setTimeout(() => {
                        this.showPeriodPicker(itemId);
                    }, 120);
                });
            }

            scroller.appendChild(button);
        }

        showPeriodPicker(itemId) {
            this.closePeriodPicker();

            const backdrop =
                document.createElement("div");

            backdrop.id =
                "jellyfinExpiryPickerBackdrop";

            backdrop.className =
                "jellyfinExpiryPickerBackdrop";

            const panel =
                document.createElement("div");

            panel.className =
                "jellyfinExpiryPicker";

            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "true");
            panel.setAttribute(
                "aria-label",
                "Schedule expiry"
            );

            const title =
                document.createElement("div");

            title.className =
                "jellyfinExpiryPickerTitle";

            title.textContent = "Schedule expiry";

            const choices =
                document.createElement("div");

            choices.className =
                "jellyfinExpiryPickerChoices";

            panel.appendChild(title);
            panel.appendChild(choices);

            const periods = [
                ["24 hours", 1],
                ["7 days", 7],
                ["14 days", 14],
                ["30 days", 30]
            ];

            for (const [label, days] of periods) {
                choices.appendChild(
                    this.createPickerButton(
                        label,
                        "schedule",
                        () => {
                            this.closePeriodPicker();
                            this.scheduleExpiry(
                                itemId,
                                days
                            );
                        }
                    )
                );
            }

            choices.appendChild(
                this.createPickerButton(
                    "Custom…",
                    "edit_calendar",
                    () => {
                        this.showCustomDaysPicker(itemId);
                    }
                )
            );

            const cancel =
                document.createElement("button");

            cancel.setAttribute("is", "emby-button");
            cancel.setAttribute("type", "button");

            cancel.className =
                "raised button-cancel jellyfinExpiryPickerCancel";

            cancel.textContent = "Cancel";

            cancel.addEventListener(
                "click",
                () => this.closePeriodPicker()
            );

            panel.appendChild(cancel);
            backdrop.appendChild(panel);

            backdrop.addEventListener(
                "click",
                event => {
                    if (event.target === backdrop) {
                        this.closePeriodPicker();
                    }
                }
            );

            document.body.appendChild(backdrop);

            const escapeHandler = event => {
                if (event.key === "Escape") {
                    this.closePeriodPicker();
                    document.removeEventListener(
                        "keydown",
                        escapeHandler
                    );
                }
            };

            document.addEventListener(
                "keydown",
                escapeHandler
            );
        }

        showCustomDaysPicker(itemId) {
            this.closePeriodPicker();

            const backdrop =
                document.createElement("div");

            backdrop.id =
                "jellyfinExpiryPickerBackdrop";

            backdrop.className =
                "jellyfinExpiryPickerBackdrop";

            const panel =
                document.createElement("div");

            panel.className =
                "jellyfinExpiryPicker";

            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "true");
            panel.setAttribute(
                "aria-label",
                "Custom expiry"
            );

            const title =
                document.createElement("div");

            title.className =
                "jellyfinExpiryPickerTitle";

            title.textContent = "Custom expiry";

            const form =
                document.createElement("form");

            form.style.padding = "0 1em 1em";

            const label =
                document.createElement("label");

            label.textContent =
                "Delete this movie in";

            label.style.display = "block";
            label.style.marginBottom = ".45em";

            const input =
                document.createElement("input");

            input.type = "number";
            input.min = "1";
            input.step = "1";
            input.value = "7";
            input.inputMode = "numeric";

            input.style.width = "100%";
            input.style.boxSizing = "border-box";
            input.style.padding = ".8em";
            input.style.fontSize = "1em";
            input.style.background = "#292929";
            input.style.color = "inherit";
            input.style.border = "1px solid rgba(255,255,255,.3)";
            input.style.borderRadius = ".2em";

            const suffix =
                document.createElement("div");

            suffix.textContent = "days";
            suffix.style.marginTop = ".4em";
            suffix.style.opacity = ".7";

            const buttons =
                document.createElement("div");

            buttons.className =
                "jellyfinExpiryDialogButtons";

            const cancel =
                document.createElement("button");

            cancel.type = "button";
            cancel.className =
                "jellyfinExpiryDialogButton jellyfinExpiryDialogButtonSecondary";
            cancel.textContent = "Cancel";

            cancel.addEventListener(
                "click",
                () => this.closePeriodPicker()
            );

            const schedule =
                document.createElement("button");

            schedule.type = "submit";
            schedule.className =
                "jellyfinExpiryDialogButton jellyfinExpiryDialogButtonPrimary";
            schedule.textContent = "Schedule";

            buttons.appendChild(cancel);
            buttons.appendChild(schedule);

            form.appendChild(label);
            form.appendChild(input);
            form.appendChild(suffix);
            form.appendChild(buttons);

            form.addEventListener(
                "submit",
                event => {
                    event.preventDefault();

                    const days =
                        Number.parseInt(
                            input.value,
                            10
                        );

                    if (
                        !Number.isInteger(days) ||
                        days < 1
                    ) {
                        input.focus();
                        this.showToast(
                            "Enter a positive whole number of days"
                        );
                        return;
                    }

                    this.closePeriodPicker();
                    this.scheduleExpiry(
                        itemId,
                        days
                    );
                }
            );

            panel.appendChild(title);
            panel.appendChild(form);
            backdrop.appendChild(panel);

            backdrop.addEventListener(
                "click",
                event => {
                    if (event.target === backdrop) {
                        this.closePeriodPicker();
                    }
                }
            );

            document.body.appendChild(backdrop);

            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        }

        createPickerButton(
            label,
            iconName,
            handler
        ) {
            const button =
                document.createElement("button");

            button.setAttribute("is", "emby-button");
            button.setAttribute("type", "button");

            button.className =
                "listItem listItem-button actionSheetMenuItem";

            const icon =
                document.createElement("span");

            icon.className =
                "actionsheetMenuItemIcon listItemIcon listItemIcon-transparent material-icons " +
                iconName;

            icon.setAttribute(
                "aria-hidden",
                "true"
            );

            const body =
                document.createElement("div");

            body.className =
                "listItemBody actionsheetListItemBody";

            const text =
                document.createElement("div");

            text.className =
                "listItemBodyText actionSheetItemText";

            text.textContent = label;

            body.appendChild(text);
            button.appendChild(icon);
            button.appendChild(body);

            button.addEventListener(
                "click",
                handler
            );

            return button;
        }

        closePeriodPicker() {
            document
                .getElementById(
                    "jellyfinExpiryPickerBackdrop"
                )
                ?.remove();
        }

        async scheduleExpiry(itemId, days) {
            const apiClient = this.getApiClient();

            if (!apiClient) {
                this.showToast(
                    "Could not schedule expiry"
                );
                return;
            }

            try {
                await this.request({
                    type: "POST",
                    url: apiClient.getUrl(
                        `JellyfinExpiry/Movies/${itemId}/Schedule`
                    ),
                    data: JSON.stringify({
                        Days: days
                    }),
                    contentType:
                        "application/json"
                });

                this.showToast(
                    days === 1
                        ? "Movie scheduled to expire in 24 hours"
                        : `Movie scheduled to expire in ${days} days`
                );

                await this.refreshExpiryBanners();
            } catch (error) {
                console.error(
                    "[JellyfinExpiry] Schedule failed",
                    error
                );

                this.showToast(
                    "Could not schedule expiry"
                );
            }
        }

        async cancelExpiry(itemId) {
            const apiClient = this.getApiClient();

            if (!apiClient) {
                this.showToast(
                    "Could not cancel expiry"
                );
                return;
            }

            try {
                await this.request({
                    type: "DELETE",
                    url: apiClient.getUrl(
                        `JellyfinExpiry/Movies/${itemId}/Schedule`
                    )
                });

                this.showToast(
                    "Movie expiry cancelled"
                );

                await this.refreshExpiryBanners();
            } catch (error) {
                console.error(
                    "[JellyfinExpiry] Cancel failed",
                    error
                );

                this.showToast(
                    "Could not cancel expiry"
                );
            }
        }

        showToast(message) {
            document
                .querySelectorAll(
                    ".jellyfinExpiryToast"
                )
                .forEach(element =>
                    element.remove()
                );

            const toast =
                document.createElement("div");

            toast.className =
                "jellyfinExpiryToast";

            toast.textContent = message;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 2600);
        }
    };
};

console.log(
    "[JellyfinExpiry] Web plugin script loaded"
);
