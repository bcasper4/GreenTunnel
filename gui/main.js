const {app, BrowserWindow, Menu, Tray, shell, ipcMain, nativeImage} = require('electron');
const windowStateKeeper = require('electron-window-state');
const debug = /--debug/.test(process.argv[2]);
const {Proxy} = require('green-tunnel');
const path = require('path');
const os = require('os');
const prompt = require('electron-prompt');
const Store = require('electron-store');

const store = new Store();

// diable any dialog box!
const electron = require('electron');
const dialog = electron.dialog;
dialog.showErrorBox = function (title, content) {
    console.log(`${title}\n${content}`);
};

// if (require('electron-squirrel-startup')) return;
const setupEvents = require('./installers/windows/setupEvents');

if (setupEvents.handleSquirrelEvent()) {
    return;
}

let win, tray, proxy;
let isOn = false;
let globalProxy = store.get('globalProxy', true);
let port = store.get('port', 8086);
let openAtLogin = app.getLoginItemSettings().openAtLogin;

console.log(app.getLoginItemSettings(), store.store);

const menuItems = [
    {
        label: 'Turn Off',
        type: 'normal',
        click: () => turnOff(),
    },
    {
        label: 'Change Port',
        type: 'normal',
        click: () => changePort(),
    },
    {
        label: 'Port Only',
        type: 'checkbox',
        checked: !globalProxy,
        click: () => togglePortOnly(),
    },
    {
        label: 'Run At Startup',
        type: 'checkbox',
        checked: openAtLogin,
        click: () => runAtLogin(),
    },
    {
        type: 'separator',
    },
    {
        label: 'Source Code',
        type: 'normal',
        click: () => shell.openExternal('https://github.com/SadeghHayeri/GreenTunnel'),
    },
    {
        label: 'Donate',
        type: 'normal',
        click: () => shell.openExternal('https://github.com/SadeghHayeri/GreenTunnel#donation'),
    },
    {
        label: 'Show main window',
        type: 'normal',
        click: () => win.show(),
    },
    {
        role: 'quit',
        label: 'Quit',
        type: 'normal',
    },
];

async function runAtLogin() {
    openAtLogin = !openAtLogin;

    app.setLoginItemSettings({
        openAtLogin,
        openAsHidden: openAtLogin,
        name: 'GreenTunnel'
    })
}

async function changePort() {
    prompt({
        title: 'Which port?',
        label: 'Port:',
        value: port,
        inputAttrs: {
            type: 'number'
        },
        type: 'input'
    }).then(async (value) => {
        if (value === null) {
            console.log('user cancelled');
        } else {
            port = value;

            store.set('port', port);

            await turnOn();
        }
    }).catch(console.error);
}

async function togglePortOnly() {
    globalProxy = !globalProxy;
    menuItems[2].checked = !globalProxy;
    store.set('globalProxy', globalProxy);

    await turnOn();
}

async function turnOff() {
    isOn = false;

    if (proxy) {
        await proxy.stop();
        proxy = null
    }

    console.log('turnOff:change status', isOn, port, globalProxy)
    win.webContents.send('changeStatus', isOn, port, globalProxy);

    menuItems[0].label = 'Enable';
    menuItems[0].click = () => turnOn();
    tray.setContextMenu(Menu.buildFromTemplate(menuItems));

    const iconPath = path.join(__dirname, 'images/iconDisabledTemplate.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray.setImage(trayIcon);
}

async function turnOn() {
    isOn = true;

    if (proxy) {
        await proxy.stop();
        proxy = null
    }

    console.log('turn on proxy', port);
    proxy = new Proxy({source: 'GUI', port});
    await proxy.start({setProxy: globalProxy});

    console.log('proxy turned on ', globalProxy);

    console.log('turnOn:change status', isOn, port, globalProxy)
    win.webContents.send('changeStatus', isOn, port, globalProxy);

    menuItems[0].label = 'Disable';
    menuItems[0].click = () => turnOff();
    tray.setContextMenu(Menu.buildFromTemplate(menuItems));

    const iconPath = path.join(__dirname, 'images/iconTemplate.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray.setImage(trayIcon);
}

function createWindow() {
    const iconPath = path.join(__dirname, 'icon.png');
    const appIcon = nativeImage.createFromPath(iconPath);

    const stateManager = windowStateKeeper();

    win = new BrowserWindow({
        width: 300,
        height: 300,
        x: stateManager.x,
        y: stateManager.y,
        maximizable: debug,
        minimizable: debug,
        fullscreenable: debug,
        resizable: debug,
        icon: appIcon,
        show: false,

        title: 'Green Tunnel',
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
        }
    });

    // save states
    stateManager.manage(win);

    win.loadFile('./view/main-page/index.html');

    win.on('ready-to-show', async function () {
        win.show();
        win.focus();
        await turnOn();
    });

    win.on('closed', () => {
        win = null
    });

    if (debug)
        win.webContents.openDevTools()
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
});

app.on('ready', () => {
    createWindow();
    const iconPath = path.join(__dirname, 'images/iconTemplate.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayIcon);
    tray.setIgnoreDoubleClickEvents(true);
    tray.setToolTip('Green Tunnel');
    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
});

app.on('before-quit', async (e) => {
    if (isOn) {
        e.preventDefault();
        await turnOff();
        app.quit();
    }
});

ipcMain.on('close-button', (event, arg) => {
    if (os.platform() === 'darwin')
        app.hide();
    else
        win.hide();
});

ipcMain.on('on-off-button', (event, arg) => {
    if (isOn)
        turnOff();
    else
        turnOn();
});
