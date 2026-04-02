//#region JS Section


var containerServices = {
    userContextCb: async () => {
        const response = await fm.Send({ type: "getUser" }, { await: true });
        return response.msg.user;
    },
    extensions: {
        getAccessTokenUserIam: async () => {
            const response = await fm.Send({ type: "getAccessTokenUserIam" }, { await: true });
            return response.msg.accessTokenUserIam;
        },
        getHeaderConsumerCode: async () => {
            const response = await fm.Send({ type: "getHeaderConsumerCode" }, { await: true });
            return response.msg.headerConsumerCode;
        },
        getHeaderConsumerCodeV2: async () => {
            const response = await fm.Send({ type: "getHeaderConsumerCodeV2" }, { await: true });
            return response.msg.headerConsumerCodeV2;
        },
        getHeader: async (moduleName, key) => {
            const response = await fm.Send({ type: "getHeader", moduleName, key }, { await: true });
            return response.msg.header;
        },
        getCorrelationId: async () => {
            const response = await fm.Send({ type: "getCorrelationId" }, { await: true });
            return response.msg.correlationId;
        },
        closePopup: async () => {
            const response = await fm.Send({ type: "closePopup" }, { await: true });
            return response.msg.closePopup;
        }
    }
};

function createPromiseData({ timeout, message }) {
    let resolver, reject;
    let timer;
    const startTimer = (timeout) => {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(() => { reject(new Error(`The operation has timed out ${message ? "for " + message : ""}. timeoutValue  : ${timeout}`)); }, timeout);
    }

    if (timeout) {
        startTimer(timeout);
    }

    return {
        startTimer,
        promise: new Promise((res, rej) => { resolver = res; reject = rej; }),
        resolver,
        reject
    };
}

const FrameMessaging = (() => {
    function frameMessaging(targetWindow) {
        this.awaitMsgList = {};
        this.targetWindow = targetWindow;
        window?.addEventListener?.("message", (ev) => {
            const packet = ev.data;
            this.OnMessage(packet, ev.source);
            const isKnownPacket = this.awaitMsgList[packet.replyId] || packet.token == "notSoSecretFM_ID_24785434" /* packets from nar */
            if (!isKnownPacket) { return; }
            if (packet.replyId) { const waiter = this.awaitMsgList[packet.replyId]; delete this.awaitMsgList[packet.replyId]; waiter(packet); return; }
        });
    }
    frameMessaging.prototype.Send = function (msg, options) {
        const packet = {
            id: CryptoHelper.CreateGuid(),
            token: "notSoSecretFM_ID_24785434",
            msg: msg,
            replyId: options.replyId
        };
        let promData;
        if (options.await) {
            promData = createPromiseData({ timeout: options.awaitTime === undefined ? 10000 : options.awaitTime, message: "frame response awaiting" });
            this.awaitMsgList[packet.id] = packet => { promData.resolver(packet); };
        }
        (options.targetWindow || this.targetWindow).postMessage(packet, "*");
        return promData && promData.promise;
    };
    frameMessaging.prototype.OnMessage = async function (packet, eventSource) {
        if (packet.msg.type == "triggerPipeline") {
            params.plateauUIRenderer.triggerPipeline({ eventName: packet.msg.eventName, parameters: packet.msg.parameters });
        }
        if (packet.msg.type == "destroyRequest") {
            await params.plateauUIRenderer.destroy();
            await this.Send({ type: "destroyResponse" }, { replyId: packet.id });
        }
    };
    return frameMessaging;
})();

const CryptoHelper = {
    guidCounter: 0,
    GetRandomWord: function (base, length) { return Math.random().toString(base).substring(2, length + 2); },
    CreateGuid: function () {
        return [8, 4, 4, 4, 6].map(length => this.GetRandomWord(36, length)).join("-") + ((++CryptoHelper.guidCounter) % 2150000000).toString(36);
    },
};

const fm = new FrameMessaging(parent);

if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = containerServices;
} else {
    window["plateauUIContainerServices"] = containerServices;
}
  //#region JS Section