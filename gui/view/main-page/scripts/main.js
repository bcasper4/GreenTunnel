const { ipcRenderer } = require('electron');

$( document ).ready(function() {

    $('#close-button').on('click', () => {
        ipcRenderer.send('close-button')
    });

    $('#on-off-button').on('click', () => {
        ipcRenderer.send('on-off-button')
    });

    ipcRenderer.on('changeStatus', (event, isOn, port, isGlobal) => {
        if(isOn) {
            $('.toggle').each(() => {
                $(this).find('*').removeClass('red');
                $(this).find('*').addClass('green');
            });
            let status = port ? ` at port ${port}` : '';
            status += isGlobal ? ' and global proxy set' : '';
            $('#status-off-on').html('is on' + status);
        } else {
            $('.toggle').each(() => {
                $(this).find('*').removeClass('green');
                $(this).find('*').addClass('red');
            });
            $('#status-off-on').html('is off');
        }
    })

});


