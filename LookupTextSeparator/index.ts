import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/autocomplete';
import { ApiHelper } from './ApiHelper';

export class LookupTextSeparator implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // Context Logic
    private container: HTMLDivElement;
    private suggestionsContainer: HTMLDivElement;
    private context: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged: () => void;
    private state: ComponentFramework.Dictionary;

    // Global Vars
    private apiHelper: ApiHelper;

    // Field
    private fieldentity: string;
    private fieldid: string;
    private fieldvalue: string;

    // Input
    private input: HTMLInputElement;

    // Manifest
    private contentSeparatorValue: ComponentFramework.LookupValue[];//ComponentFramework.PropertyTypes.LookupProperty; // { id: string, name: string, entityType: string }[] | undefined;
    private separator: string;
    private label: string;
    private editMode: boolean;
    private showLeft: boolean;
    private showLabel: boolean;
    private searchlength: number;// = 3; // Example search length, adjust as needed
    
    // Records
    private records: ComponentFramework.WebApi.Entity; //{ fullName: string, left: string, right: string, entity: string, id: string }[]; // Array to store parsed records
    public selections: ComponentFramework.LookupValue[];

    // Constructor
    constructor() {
        this.records = [];
        this.selections = [];
    }

    // Initialize the control instance
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        console.log('LTS | Initializing control');
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.state = state;
        this.container = container;
        this.suggestionsContainer = document.createElement("div"); 
        this.loadData();
        this.loadForm();
    }

    // Load manifest data values
    private loadData(): void {
        console.log('LTS | Loading data');
        //get Manifest Data
        this.editMode = this.context.parameters.EditMode.raw;
        this.separator = this.context.parameters.Separator.raw || ",";
        this.contentSeparatorValue = this.context.parameters.LookupTextSeparatorValue.raw; //as ComponentFramework.PropertyTypes.LookupProperty; //{ id: string, name: string, entityType: string }[];
        this.showLeft = this.context.parameters.LeftContent.raw || false;
        this.searchlength = this.context.parameters.SearchLength.raw || 3;
        this.showLabel = this.context.parameters.LabelDisplay.raw || false;
        this.label = this.context.parameters.LabelValue.raw || " ";
        this.fieldentity = this.contentSeparatorValue[0].entityType || "";
        this.fieldid = this.contentSeparatorValue[0].id || "";
        this.fieldvalue = this.contentSeparatorValue[0].name || "";

        if(!this.fieldentity) {
            alert('No bound Lookup can be found, unable to autocomplete the assigned lookup, please refresh the page and try again.')
            return;//no field, uh oh!
        }
        //get metadata for current field        
        this.apiHelper = new ApiHelper(this.context, this.fieldentity);
        this.apiHelper.getTableMetadata(); 
        console.log('LTS | Loaded data:', {
            editMode: this.editMode,
            separator: this.separator,
            contentSeparatorValue: this.contentSeparatorValue,
            fieldentity: this.fieldentity,
            fieldid: this.fieldid,
            fieldvalue: this.fieldvalue,
            primarynameattribute: this.apiHelper.primaryNameAttirbute
        });
    }

    // Load HTML control values and set input HTML to the string
    private loadForm(): void {
        console.log('LTS | Loading form');
        this.input = this.getElement("input", "Input", "myinput") as HTMLInputElement;
        this.input.disabled = !this.editMode;
        console.log('LTS | Loading form ' + this.input.innerHTML);
        this.container.appendChild(this.input);
        console.log('LTS | Loading form: ' + this.suggestionsContainer);
        this.container.appendChild(this.suggestionsContainer);
        // Attach oninput event to the input
        this.input.oninput = () => this.onInputChange();
        this.setFormLoadValue();
    }

    private onInputChange(): void {
        console.log('LTS | Input changed:', this.input.value);
        const searchTerm = this.input.value;
        this.suggestionsContainer.innerHTML = "";
        if (searchTerm.length >= this.searchlength) {
            console.log('LTS | Making API call with search term:', searchTerm);
            this.apiHelper.getRecordsByAttribute(this.fieldentity, this.apiHelper.primaryNameAttirbute, searchTerm)
            .then((data: ComponentFramework.WebApi.RetrieveMultipleResponse) => {
                console.log('LTS | API call returned data: ', data.entities);
                this.records = data.entities;               
                console.log('LTS | Parsed API records: ', this.records);
                this.setAutoComplete();
            }).catch(error => { 
                console.error('LTS | API call failed:', error);
            });
        }
    }
    private setAutoComplete(): void {
        console.log('LTS | Setting up autocomplete');
        const names: string[] = this.records ? this.records.map((record: ComponentFramework.WebApi.Entity)  => this.parseEntity(record) ) : [];
        this.selections = this.records.map((record: ComponentFramework.WebApi.Entity)  => ({ value: record[this.apiHelper.primaryIdAttribute], label: record[this.apiHelper.primaryNameAttirbute] }));
        $(this.input).autocomplete({
            source: names,
            select: (event: Event, ui: JQueryUI.AutocompleteUIParams) => {
                if (ui.item) {
                    console.log('LTS | Autocomplete item selected:', ui.item);
                    this.setValue(ui.item.value, ui.item.value !== "");                    
                }
            }
        });
    }

    //Parse records to get an array of objects with required properties
    private parseRecords(records: { id: string, name: string, entity: string }[]): { fullName: string, left: string, right: string, entity: string, id: string }[] {
        console.log('LTS | Parsing records:', records);
        return records.map(record => {
            const [left, right] = record.name.split(this.separator);
            return {
                fullName: record.name,
                left: left.trim(),
                right: right.trim(),
                entity: record.entity,
                id: record.id
            };
        });
    }
    private parseEntity(item: ComponentFramework.WebApi.Entity): ComponentFramework.WebApi.Entity{
        const parsedValue = this.showLeft ? 
        item[this.apiHelper.primaryNameAttirbute].split(this.separator)[0].trim() : 
        item[this.apiHelper.primaryNameAttirbute].split(this.separator)[1].trim();
        return ({
            value: item[this.apiHelper.primaryIdAttribute],
            label: parsedValue            
        });
    }
    // Set the selected suggested value to the lookup field
    private setValue(selectedId: string, notifychange?: boolean): void {
        console.log('LTS | Setting value for selected ID:', selectedId);
        const foundRecord = this.records.find((record: ComponentFramework.WebApi.Entity) => record[this.apiHelper.primaryIdAttribute] === selectedId);
        if (foundRecord) {
            console.log('LTS | Found record:', foundRecord);
            this.contentSeparatorValue = [{
                id: foundRecord.id,
                name: foundRecord.fullName,
                entityType: foundRecord.entity
            }];
            console.log('LTS | Assigned contentSeparatorValue:', this.contentSeparatorValue);
            if(notifychange)
                this.notifyOutputChanged();
        } else 
            console.log('LTS | Unable to set value for selected ID:', selectedId);
    }
    private getElement(type: string, id: string, className: string): HTMLElement {
        const obj = document.createElement(type);
        obj.id = id;
        obj.className = className;
        return obj;
    }
    
    // Set the control value to the input for the content separator
    private setFormLoadValue(): void {
        console.log('LTS | Setting form load value');
        try {
            if(!this.separator) return;
            const content = this.fieldvalue.split(this.separator);
            if (content.length > 0) {
                this.input.value = this.showLeft ? content[0].trim() : content[1].trim();
            }
        } catch (error) {
            alert("LTS | Please contact support, the following error occurred: ERROR:" + error);
        }
    }

    // Called when any value in the property bag has changed
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        console.log('LTS | Updating view');
        this.context = context;
        //this.loadData();
        //this.setFormLoadValue();
    }

    // Returns an object based on nomenclature defined in manifest
    public getOutputs(): IOutputs {
        console.log('LTS | Getting outputs');
        return {
            LookupTextSeparatorValue: this.contentSeparatorValue
        };
    }

    // Called when the control is to be removed from the DOM tree
    public destroy(): void {
        console.log('LTS | Destroying control');
        // Add code to cleanup control if necessary

    }
}
