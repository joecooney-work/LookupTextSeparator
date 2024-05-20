// src/types/jquery-ui.d.ts
declare module 'jquery-ui/ui/widgets/autocomplete' {//is this the right location?
    import * as jquery from 'jquery';
    export = jquery;
}

interface JQuery {
    autocomplete(options: any): JQuery;
    autocomplete(method: string, ...params: any[]): any;
}

interface AutocompleteUIParams {
    item: {
        label: string;
        value: string;
    };
}
