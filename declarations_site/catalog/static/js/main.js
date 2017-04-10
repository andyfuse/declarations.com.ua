document.addEventListener(
    "touchstart",
    function(){},
    true
);

$(function() {
    function setColumnsHeights (list, item) {
        $list = $(list);
        $items = $list.find(item);
        $items.css('height', 'auto');
        var perRow = Math.round($list.width() / $items.width());

        //let's calc how many cards in row now
        if (perRow == null || perRow < 2) {
            return true;
        }

        for (var i = 0, j = $items.length; i < j; i += perRow) {
            //set all heights in current row to max.height in current row
            var maxHeight = 0,
                $row = $items.slice(i, i + perRow);
            $row.each(function () {
                var itemHeight = parseInt($(this).outerHeight());
                if (itemHeight > maxHeight) maxHeight = itemHeight;
            });
            $row.css('height', maxHeight);
        }
    }

    function hideme($ib) {
        $ib.css("height", 10);
    }

    $("#infobox a#closeme").on("click", function() {
        $ib = $('#infobox');

        $ib
            .addClass("animated fadeOutLeftBig")
            .addClass("hideme")
            .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
                hideme($ib));
    });

    $('#list').on("click", function(event){
        event.preventDefault();
        $('.search-results .item').addClass('list-group-item');
    });

    $('#grid').on("click", function(event){
        event.preventDefault();
        $('.search-results .item')
            .removeClass('list-group-item')
            .addClass('grid-group-item');
    });

    $('.navbar-toggle').on('click', function(){
        $(this).toggleClass('open');
    });

    //In case we beed to add other blocks from other pages
    function _setColumnsHeights() {
        setColumnsHeights ('.search-results', '.item');
    }

    //generate table of contest for nacp decls
    function generateTocNacp() {
        $( "<div id='nacp-toc'><a id='toc-collapse' data-toggle='tooltip' data-placement='left' title='Згорнути'><span>Зміст декларації</span></a><h2>Зміст:</h2><ul></ul></div>" ).insertAfter( ".sub-header" );

        //lets find all text without tag = text nodes
        $("#nacp_decl")
            .contents()
            .filter(function() {
                // get only the text nodes
                return this.nodeType === 3;
            })
            .wrap( "<p></p>" );

        $('#nacp_decl header:not(.decl-earnings-header)').each(function(){
            $(this).nextUntil("header").andSelf().wrapAll('<div class="nacp-section" />');
        });

        $('.nacp-section').each(function( index ) {
            var $this = $(this),
                $h2 = $this.find('h2'),
                text = $h2.text(),
                $someInfo = $this.find('table, .personal-info, label');
                emptyClass = '';

            $this.find('header').children().not('h2').insertAfter($this.find('header'));
            $this.children().not('header').wrapAll('<div class="body" />');

            if($someInfo.length == 0) {
                emptyClass = 'empty';
                $this.addClass(emptyClass);
                $this.find('header').attr('data-toggle', 'collapse').attr('data-target', '#collapse-'+index).attr('aria-expanded', 'false');
                $this.find('.body').addClass('collapse').attr('id', 'collapse-'+index).attr('aria-expanded', 'false');
            }

            var a = $('<a />', {
                'href' : '#toc-id-' + index,
                'text' : text,
                'class': emptyClass
            });

            $this.attr('id', 'toc-id-' + index);
            li = $('<li />').append(a).appendTo('#nacp-toc ul');

            // [2.2] - [15]
            if(index > 1 && index < 16) {
                var $body = $this.find('.body');
                $body.each(function(index2) {
                    $(this).find('p').nextUntil('div').andSelf().wrapAll('<div class="help-text collapse" />');
                    var $helpText = $(this).find('.help-text');
                    $helpText.attr('id', 'help-text-collapse-' + index).attr('aria-expanded', 'false');
                    $('<span data-toggle="tooltip" data-placement="top" title="Пояснення щодо цього розділу декларації"><span class="collapse-help-text glyphicon glyphicon-option-horizontal" role="button" data-toggle="collapse" data-target="#help-text-collapse-' + index +'" aria-expanded="false"></span></span>').insertBefore($helpText);
                });
            }
        });

        if($(window).width() < 1600) {
            $( "#toc-collapse" ).css('display', 'inline-block');

            $( "#nacp-toc" ).animate({
                right: -320
            }, 1000, function() {
                $( "#nacp-toc" ).addClass('closed');
                $( "#toc-collapse" ).css('display', 'inline-block').attr('data-original-title', 'Відкрити');
            });
        }

        $(document).on('click', '#nacp-toc ul a', function(){
            if($(window).width() < 1600) {
                $('#nacp-toc').toggleClass('closed');
            }
        });

        $(document).on('click', '#toc-collapse', function(){
            $('#nacp-toc').toggleClass('closed').css('right', '');

            if ($('#nacp-toc').hasClass('closed')) {
                $('#toc-collapse').attr('data-original-title', 'Відкрити');
            } else {
                $('#toc-collapse').attr('data-original-title', 'Згорнути');
            }
        });
    }
    
    function replaceDeclText4Icons() {
        $('span:contains("[Конфіденційна інформація]")').html('<div class="decl-hidden-info" data-toggle="tooltip" data-placement="top" title="Конфіденційна інформація"><span class="glyphicon glyphicon-eye-close"></span></div>');
        $('[data-toggle="tooltip"]').tooltip();
    }

    $(document).ready(function() {
        $.material.init();
        $('[data-toggle="tooltip"]').tooltip();

        if($('.declaration-page-nacp').length > 0) {
            generateTocNacp();
            replaceDeclText4Icons();
        }

        $("#search-form").typeahead({
            minLength: 2,
            autoSelect: false,
            source: function(query, process) {
                $.get('/ajax/suggest', {"q": query})
                    .success(function(data){
                        process(data);
                    })
            },
            matcher: function() {
                // Big guys are playing here
                return true;
            }
        });

        // submit search form on enter (fix typeahead)
        $('#search-form').on('keydown', function(e) {
            if (e.keyCode == 13) {
                var ta = $(this).data('typeahead'),
                    val = ta.$menu.find('.active').data('value');
                if (val)
                    $('#search-form').val(val);
                $('#front-searchbox form').submit();
            }
        });
    });

    $( window ).load(function() {
        _setColumnsHeights();
    });

    $( window ).on( 'resize', function () {
        _setColumnsHeights();
    });

});
