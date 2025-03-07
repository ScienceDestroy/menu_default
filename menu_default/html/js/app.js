(function(){
    window.ESX_MENU = {};
    ESX_MENU.ResourceName = 'menu_default';
    ESX_MENU.opened = {};
    ESX_MENU.focus = [];
    ESX_MENU.pos = {};

    ESX_MENU.CloseAll = function() {
        ESX_MENU.opened = {};
        ESX_MENU.pos = {};
        ESX_MENU.focus = [];
        ESX_MENU.render();
    };
    
    ESX_MENU.open = function(namespace, name, data) {
        ESX_MENU.CloseAll();
        
        if (typeof ESX_MENU.opened[namespace] == 'undefined') {
            ESX_MENU.opened[namespace] = {};
        }
    
        if (typeof ESX_MENU.opened[namespace][name] != 'undefined') {
            ESX_MENU.close(namespace, name);
        }
    
        if (typeof ESX_MENU.pos[namespace] == 'undefined') {
            ESX_MENU.pos[namespace] = {};
        }
    
        for (let i=0; i<data.elements.length; i++) {
            if (typeof data.elements[i].type == 'undefined') {
                data.elements[i].type = 'default';
            }
        }
    
        data._index = ESX_MENU.focus.length;
        data._namespace = namespace;
        data._name = name;
    
        for (let i=0; i<data.elements.length; i++) {
            data.elements[i]._namespace = namespace;
            data.elements[i]._name = name;
        }
    
        ESX_MENU.opened[namespace][name] = data;
        ESX_MENU.pos[namespace][name] = 0;
    
        for (let i=0; i<data.elements.length; i++) {
            if (data.elements[i].selected) {
                ESX_MENU.pos[namespace][name] = i;
            } else {
                data.elements[i].selected = false;
            }
        }
    
        ESX_MENU.focus = [{
            namespace: namespace,
            name: name
        }];
    
        ESX_MENU.render();

        // Wait for the menu to be rendered before scrolling
        setTimeout(() => {
            const selectedElement = document.querySelector(`#menu_${namespace}_${name} .menu-item.selected`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    };

    $(document).keyup(function(e) {
        if (e.key === "Escape") {
            let focused = ESX_MENU.getFocused();
            if (typeof focused != 'undefined') {
                ESX_MENU.cancel(focused.namespace, focused.name);
                $.post(`http://${ESX_MENU.ResourceName}/menu_cancel`, JSON.stringify({
                    _namespace: focused.namespace,
                    _name: focused.name
                }));
                
                // Check if this was the last open menu
                let hasOtherOpenMenus = false;
                for (let ns in ESX_MENU.opened) {
                    for (let n in ESX_MENU.opened[ns]) {
                        if (ns !== focused.namespace || n !== focused.name) {
                            hasOtherOpenMenus = true;
                            break;
                        }
                    }
                    if (hasOtherOpenMenus) break;
                }
                
                // If no other menus are open, ensure NUI focus is disabled
                if (!hasOtherOpenMenus) {
                    $.post(`http://${ESX_MENU.ResourceName}/menu_closed`, JSON.stringify({}));
                }
            }
        }
    });
    
    ESX_MENU.close = function(namespace, name) {
        delete ESX_MENU.opened[namespace][name];
    
        for (let i=0; i<ESX_MENU.focus.length; i++) {
            if (ESX_MENU.focus[i].namespace == namespace && ESX_MENU.focus[i].name == name) {
                ESX_MENU.focus.splice(i, 1);
                break;
            }
        }
    
        ESX_MENU.render();
    };

    ESX_MENU.render = function() {
        let menuContainer = document.getElementById('menus');
        let focused = ESX_MENU.getFocused();
        menuContainer.innerHTML = '';
        $(menuContainer).hide();
        $('.background').css('display', "none");

        for (let namespace in ESX_MENU.opened) {
            for (let name in ESX_MENU.opened[namespace]) {
                let menuData = ESX_MENU.opened[namespace][name];
                
                const menuDiv = document.createElement('div');
                menuDiv.id = `menu_${namespace}_${name}`;
                menuDiv.className = `menu${menuData.align ? ` align-${menuData.align}` : ''}`;
                const existingMenus = document.querySelectorAll('.menu');
                if (existingMenus.length > 0) {
                    const lastMenu = existingMenus[existingMenus.length - 1];
                    const lastRect = lastMenu.getBoundingClientRect();
                    menuDiv.style.transform = `translate(${lastRect.right + 20}px, 0px)`;
                }
                menuDiv.style.opacity = '0';
                menuDiv.style.position = 'absolute';
                setTimeout(() => {
                    menuDiv.style.opacity = '1';
                }, 50);

                const headDiv = document.createElement('div');
                headDiv.className = 'head';
                headDiv.style.cursor = 'move';
                const headSpan = document.createElement('span');
                headSpan.innerHTML = menuData.title;
                headDiv.appendChild(headSpan);
                menuDiv.appendChild(headDiv);

                let isDragging = false;
                let startX = 0;
                let startY = 0;
                let menuStartX = 0;
                let menuStartY = 0;

                function getTranslateValues(element) {
                    const style = window.getComputedStyle(element);
                    const matrix = new DOMMatrixReadOnly(style.transform);
                    return {
                        x: matrix.m41,
                        y: matrix.m42
                    };
                }

                headDiv.addEventListener('mousedown', function(e) {
                    if (e.target === headDiv) {
                        isDragging = true;
                        const currentTransform = getTranslateValues(menuDiv);
                        menuStartX = currentTransform.x;
                        menuStartY = currentTransform.y;
                        startX = e.clientX;
                        startY = e.clientY;
                        
                        menuDiv.style.transition = 'none';
                    }
                });

                document.addEventListener('mousemove', function(e) {
                    if (!isDragging) return;
                    
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    
                    const newX = menuStartX + dx;
                    const newY = menuStartY + dy;
                    
                    menuDiv.style.transform = `translate(${newX}px, ${newY}px)`;
                });

                document.addEventListener('mouseup', function() {
                    if (isDragging) {
                        isDragging = false;
                        menuDiv.style.transition = '';
                    }
                });

                const itemsDiv = document.createElement('div');
                itemsDiv.className = 'menu-items';

                for (let i = 0; i < menuData.elements.length; i++) {
                    const element = menuData.elements[i];
                    const itemDiv = document.createElement('div');
                    itemDiv.className = `menu-item${i === ESX_MENU.pos[namespace][name] ? ' selected' : ''}`;
                    itemDiv.setAttribute('data-index', i);
                    itemDiv.setAttribute('data-type', element.type || 'default');

                    let label = element.label;
                    if (element.type === 'slider') {
                        const sliderLabel = element.options ? element.options[element.value] : element.value;
                        label += ` : <${sliderLabel}>`;
                    }
                    itemDiv.innerHTML = label;

                    itemDiv.addEventListener('click', function(e) {
                        const index = parseInt(this.getAttribute('data-index'));
                        const type = this.getAttribute('data-type');
                        
                        $(this).parent().find('.menu-item').removeClass('selected');
                        $(this).addClass('selected');
                        
                        ESX_MENU.pos[namespace][name] = index;
                        
                        if (type === 'slider') {
                            const rect = this.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const isRight = clickX > rect.width / 2;
                            
                            const elem = menuData.elements[index];
                            if (isRight) {
                                if (elem.options && elem.value < elem.options.length - 1) {
                                    elem.value++;
                                } else if (elem.max && elem.value < elem.max) {
                                    elem.value++;
                                }
                            } else {
                                if (elem.value > (elem.min || 0)) {
                                    elem.value--;
                                }
                            }
                            ESX_MENU.change(namespace, name, elem);
                            ESX_MENU.render();
                        } else {
                            ESX_MENU.submit(namespace, name, menuData.elements[index]);
                        }
                    });

                    itemDiv.addEventListener('mouseenter', function() {
                        this.classList.add('hover');
                    });
                    
                    itemDiv.addEventListener('mouseleave', function() {
                        this.classList.remove('hover');
                    });

                    itemsDiv.appendChild(itemDiv);
                }

                menuDiv.appendChild(itemsDiv);
                menuContainer.appendChild(menuDiv);
            }
        }

        if (typeof focused != 'undefined') {
            $('#menu_' + focused.namespace + '_' + focused.name).show();
            $('.background').css('display', "block");
        }

        $(menuContainer).show();

        // Scroll to selected item after render
        if (focused) {
            setTimeout(() => {
                const selectedElement = document.querySelector(`#menu_${focused.namespace}_${focused.name} .menu-item.selected`);
                if (selectedElement) {
                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
        }
    };

    ESX_MENU.submit = function(namespace, name, data) {
        $.post(`http://${ESX_MENU.ResourceName}/menu_submit`, JSON.stringify({
            _namespace: namespace,
            _name: name,
            current: data,
            elements: ESX_MENU.opened[namespace][name].elements
        }));
    };

    ESX_MENU.cancel = function(namespace, name) {
        $.post(`http://${ESX_MENU.ResourceName}/menu_cancel`, JSON.stringify({
            _namespace: namespace,
            _name: name
        }));
    };

    ESX_MENU.change = function(namespace, name, data) {
        $.post(`http://${ESX_MENU.ResourceName}/menu_change`, JSON.stringify({
            _namespace: namespace,
            _name: name,
            current: data,
            elements: ESX_MENU.opened[namespace][name].elements
        }));
    };

    ESX_MENU.getFocused = function() {
        return ESX_MENU.focus[ESX_MENU.focus.length - 1];
    };

    window.onData = (data) => {
        switch (data.action) {
            case 'openMenu': {
                ESX_MENU.open(data.namespace, data.name, data.data);
                break;
            }
    
            case 'closeMenu': {
                ESX_MENU.close(data.namespace, data.name);
                break;
            }
    
            case 'controlPressed': {
                switch (data.control) {
                    case 'ENTER': {
                        let focused = ESX_MENU.getFocused();
                        if (typeof focused != 'undefined') {
                            let menu = ESX_MENU.opened[focused.namespace][focused.name];
                            let pos = ESX_MENU.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];
    
                            if (menu.elements.length > 0) {
                                ESX_MENU.submit(focused.namespace, focused.name, elem);
                            }
                        }
                        break;
                    }
    
                    case 'BACKSPACE': {
                        let focused = ESX_MENU.getFocused();
                        if (typeof focused != 'undefined') {
                            ESX_MENU.cancel(focused.namespace, focused.name);
                        }
                        break;
                    }
    
                    case 'TOP': {
                        let focused = ESX_MENU.getFocused();
                        if (typeof focused != 'undefined') {
                            let menu = ESX_MENU.opened[focused.namespace][focused.name];
                            let pos = ESX_MENU.pos[focused.namespace][focused.name];
    
                            if (pos > 0) {
                                ESX_MENU.pos[focused.namespace][focused.name]--;
                            } else {
                                ESX_MENU.pos[focused.namespace][focused.name] = menu.elements.length - 1;
                            }
    
                            let elem = menu.elements[ESX_MENU.pos[focused.namespace][focused.name]];
    
                            for (let i = 0; i < menu.elements.length; i++) {
                                if (i == ESX_MENU.pos[focused.namespace][focused.name]) {
                                    menu.elements[i].selected = true;
                                } else {
                                    menu.elements[i].selected = false;
                                }
                            }
    
                            ESX_MENU.change(focused.namespace, focused.name, elem);
                            ESX_MENU.render();
    
                            // Add timeout for scrolling
                            setTimeout(() => {
                                const selectedElement = document.querySelector(`#menu_${focused.namespace}_${focused.name} .menu-item.selected`);
                                if (selectedElement) {
                                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            }, 100);
                        }
                        break;
                    }
    
                    case 'DOWN': {
                        let focused = ESX_MENU.getFocused();
                        if (typeof focused != 'undefined') {
                            let menu = ESX_MENU.opened[focused.namespace][focused.name];
                            let pos = ESX_MENU.pos[focused.namespace][focused.name];
                            let length = menu.elements.length;
    
                            if (pos < length - 1) {
                                ESX_MENU.pos[focused.namespace][focused.name]++;
                            } else {
                                ESX_MENU.pos[focused.namespace][focused.name] = 0;
                            }
    
                            let elem = menu.elements[ESX_MENU.pos[focused.namespace][focused.name]];
    
                            for (let i = 0; i < menu.elements.length; i++) {
                                if (i == ESX_MENU.pos[focused.namespace][focused.name]) {
                                    menu.elements[i].selected = true;
                                } else {
                                    menu.elements[i].selected = false;
                                }
                            }
    
                            ESX_MENU.change(focused.namespace, focused.name, elem);
                            ESX_MENU.render();
    
                            // Add timeout for scrolling
                            setTimeout(() => {
                                const selectedElement = document.querySelector(`#menu_${focused.namespace}_${focused.name} .menu-item.selected`);
                                if (selectedElement) {
                                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            }, 100);
                        }
                        break;
                    }
    
                    case 'LEFT': {
                        let focused = ESX_MENU.getFocused();
                        if (typeof focused != 'undefined') {
                            let menu = ESX_MENU.opened[focused.namespace][focused.name];
                            let pos = ESX_MENU.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];
    
                            switch (elem.type) {
                                case 'default': break;
    
                                case 'slider': {
                                    let min = (typeof elem.min == 'undefined') ? 0 : elem.min;
                                    if (elem.value > min) {
                                        elem.value--;
                                        ESX_MENU.change(focused.namespace, focused.name, elem);
                                    }
                                    ESX_MENU.render();
                                    break;
                                }
    
                                default: break;
                            }
    
                            // Add timeout for scrolling
                            setTimeout(() => {
                                const selectedElement = document.querySelector(`#menu_${focused.namespace}_${focused.name} .menu-item.selected`);
                                if (selectedElement) {
                                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            }, 100);
                        }
                        break;
                    }
    
                    case 'RIGHT': {
                        let focused = ESX_MENU.getFocused();
                        if (typeof focused != 'undefined') {
                            let menu = ESX_MENU.opened[focused.namespace][focused.name];
                            let pos = ESX_MENU.pos[focused.namespace][focused.name];
                            let elem = menu.elements[pos];
    
                            switch (elem.type) {
                                case 'default': break;
    
                                case 'slider': {
                                    if (typeof elem.options != 'undefined' && elem.value < elem.options.length - 1) {
                                        elem.value++;
                                        ESX_MENU.change(focused.namespace, focused.name, elem);
                                    }
    
                                    if (typeof elem.max != 'undefined' && elem.value < elem.max) {
                                        elem.value++;
                                        ESX_MENU.change(focused.namespace, focused.name, elem);
                                    }
    
                                    ESX_MENU.render();
                                    break;
                                }
    
                                default: break;
                            }
    
                            // Add timeout for scrolling
                            setTimeout(() => {
                                const selectedElement = document.querySelector(`#menu_${focused.namespace}_${focused.name} .menu-item.selected`);
                                if (selectedElement) {
                                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            }, 100);
                        }
                        break;
                    }
    
                    default: break;
                }
                break;
            }
        }
    };

    window.onload = function(e) {
        window.addEventListener('message', (event) => {
            onData(event.data);
        });
    };
})();