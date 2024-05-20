// src/types/jquery-ui.d.ts
declare module 'jquery-ui/ui/widgets/autocomplete' {
    import * as jquery from 'jquery';
    export = jquery;
}

interface JQuery {
    autocomplete(options: any): JQuery;
    autocomplete(method: string, ...params: any[]): any;
}

interface JQueryUI {
    AutocompleteOptions: any;
    AutocompleteUIParams: {
        item: {
            label: string;
            value: string;
        };
    };
}
