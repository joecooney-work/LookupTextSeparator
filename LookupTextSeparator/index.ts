import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/autocomplete';
import { ApiHelper } from './ApiHelper';

export class LookupTextSeparator implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // Context Logic
    private container: HTMLDivElement;
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
    private contentSeparatorValue: { id: string, name: string, entityType: string }[] | undefined;
    private separator: string;
    private editMode: boolean;
    private searchlength: number;// = 3; // Example search length, adjust as needed

    // Records
    private records: { fullName: string, left: string, right: string, entity: string, id: string }[]; // Array to store parsed records

    // Constructor
    constructor() {
        this.records = [];
    }

    // Initialize the control instance
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        console.log('Initializing control');
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.state = state;
        this.container = container;
        this.apiHelper = new ApiHelper((context as any).page.getClientUrl());
        this.loadData();
        this.loadForm();
    }

    // Load manifest data values
    private loadData(): void {
        console.log('Loading data');
        this.editMode = this.context.parameters.EditMode.raw;
        this.separator = this.context.parameters.Separator.raw || ",";
        this.contentSeparatorValue = this.context.parameters.LookupTextSeparatorValue.raw as { id: string, name: string, entityType: string }[];

        if (this.contentSeparatorValue && this.contentSeparatorValue.length > 0) {
            this.fieldentity = this.contentSeparatorValue[0].entityType || "";
            this.fieldid = this.contentSeparatorValue[0].id || "";
            this.fieldvalue = this.contentSeparatorValue[0].name || "";
        } else {
            this.fieldentity = "";
            this.fieldid = "";
            this.fieldvalue = "";
        }
        console.log('Loaded data:', {
            editMode: this.editMode,
            separator: this.separator,
            contentSeparatorValue: this.contentSeparatorValue,
            fieldentity: this.fieldentity,
            fieldid: this.fieldid,
            fieldvalue: this.fieldvalue
        });
    }

    // Load HTML control values and set input HTML to the string
    private loadForm(): void {
        console.log('Loading form');
        this.input = this.getElement("input", "Input", "myinput") as HTMLInputElement;
        this.input.disabled = !this.editMode;
        this.container.appendChild(this.input);

        // Attach oninput event to the input
        this.input.oninput = () => this.onInputChange();
        this.setFormLoadValue();
        this.setAutoComplete();        
    }

    private onInputChange(): void {
        console.log('Input changed:', this.input.value);
        const searchTerm = this.input.value;
        if (searchTerm.length >= this.searchlength) {
            console.log('Making API call with search term:', searchTerm);
            this.apiHelper.fetchRecords(searchTerm).then((data: any) => {
                console.log('API call returned data:', data);
                // Ensure data is in the correct format
                const formattedData = data.map((item: any) => ({
                    id: item.id,
                    jc_name: item.jc_name,
                    entity: item.entity
                }));

                this.records = this.parseRecords(formattedData);
                console.log('Parsed records:', this.records);
                $(this.input).autocomplete("option", "source", this.records.map(record => ({
                    label: record.right,
                    value: record.id
                })));
            }).catch(error => {
                console.error('API call failed:', error);
            });
        }
    }

    private setAutoComplete(): void {
        console.log('Setting up autocomplete');
        $(this.input).autocomplete({
            source: [],
            select: (event: Event, ui: any) => {
                if (ui.item) {
                    console.log('Autocomplete item selected:', ui.item);
                    this.setValue(ui.item.value);
                }
            }
        });
    }

    // Parse records to get an array of objects with required properties
    private parseRecords(records: { id: string, jc_name: string, entity: string }[]): { fullName: string, left: string, right: string, entity: string, id: string }[] {
        console.log('Parsing records:', records);
        return records.map(record => {
            const [left, right] = record.jc_name.split(this.separator);
            return {
                fullName: record.jc_name,
                left: left.trim(),
                right: right.trim(),
                entity: record.entity,
                id: record.id
            };
        });
    }

    // Set the selected value to the lookup field
    private setValue(selectedId: string): void {
        console.log('Setting value for selected ID:', selectedId);
        const foundRecord = this.records.find(record => record.id === selectedId);
        if (foundRecord) {
            console.log('Found record:', foundRecord);
            this.contentSeparatorValue = [{
                id: foundRecord.id,
                name: foundRecord.fullName,
                entityType: foundRecord.entity
            }];
            console.log('Assigned contentSeparatorValue:', this.contentSeparatorValue);
            this.notifyOutputChanged();
        }
    }

    private getElement(type: string, id: string, className: string): HTMLElement {
        const obj = document.createElement(type);
        obj.id = id;
        obj.className = className;
        return obj;
    }

    // Set the control value to the input for the content separator
    private setFormLoadValue(): void {
        console.log('Setting form load value');
        try {
            const content = this.fieldvalue.split(this.separator);
            if (content.length > 0) {
                this.input.value = content[0].trim();
            }
        } catch (error) {
            alert("Please contact support, the following error occurred: ERROR:" + error);
        }
    }

    // Called when any value in the property bag has changed
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        console.log('Updating view');
        this.context = context;
        this.loadData();
        this.setFormLoadValue();
    }

    // Returns an object based on nomenclature defined in manifest
    public getOutputs(): IOutputs {
        console.log('Getting outputs');
        return {
            LookupTextSeparatorValue: this.contentSeparatorValue
        };
    }

    // Called when the control is to be removed from the DOM tree
    public destroy(): void {
        console.log('Destroying control');
        // Add code to cleanup control if necessary
    }
}
