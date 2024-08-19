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

    //Results
    private entities: Promise<ComponentFramework.WebApi.Entity>;

    // Manifest
    private contentSeparatorValue: { id: string, name: string, entityType: string }[] | undefined;
    private separator: string;
    private label: string;
    private editMode: boolean;
    private showLeft: boolean;
    private showLabel: boolean;
    private searchlength: number;// = 3; // Example search length, adjust as needed

    // Records
    private records: { fullName: string, left: string, right: string, entity: string, id: string }[]; // Array to store parsed records

    // Constructor
    constructor() {
        this.records = [];
    }

    // Initialize the control instance
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        console.log('LTS | Initializing control');
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.state = state;
        this.container = container; 
        this.loadData();
        this.loadForm();
    }

    // Load manifest data values
    private loadData(): void {
        console.log('LTS | Loading data');
        //get Manifest Data
        this.editMode = this.context.parameters.EditMode.raw;
        this.separator = this.context.parameters.Separator.raw || ",";
        this.contentSeparatorValue = this.context.parameters.LookupTextSeparatorValue.raw as { id: string, name: string, entityType: string }[];
        this.showLeft = this.context.parameters.LeftContent.raw || false;
        this.searchlength = this.context.parameters.SearchLength.raw || 3;
        this.showLabel = this.context.parameters.LabelDisplay.raw || false;
        this.label = this.context.parameters.LabelValue.raw || " ";
        this.fieldentity = this.contentSeparatorValue[0].entityType || "";
        this.fieldid = this.contentSeparatorValue[0].id || "";
        this.fieldvalue = this.contentSeparatorValue[0].name || "";

        if(!this.fieldentity) return;//no field, uh oh!
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
        //testing
        //setTimeout(() => console.log(this.apiHelper.primaryNameAttirbute), 5000);
    }

    // Load HTML control values and set input HTML to the string
    private loadForm(): void {
        console.log('LTS | Loading form');
        this.input = this.getElement("input", "Input", "myinput") as HTMLInputElement;
        this.input.disabled = !this.editMode;
        this.container.appendChild(this.input);

        // Attach oninput event to the input
        this.input.oninput = () => this.onInputChange();
        this.setFormLoadValue();
        this.setAutoComplete();        
    }

    private onInputChange(): void {
        console.log('LTS | Input changed:', this.input.value);
        const searchTerm = this.input.value;
        if (searchTerm.length >= this.searchlength) {
            console.log('LTS | Making API call with search term:', searchTerm);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.apiHelper.getRecordsByAttribute(this.fieldentity, this.apiHelper.primaryNameAttirbute, searchTerm).then((data: any) => {
                console.log('LTS | API call returned data:', data.entities);
                // Ensure data is in the correct format               
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formattedData = data.entities.map((item: any) => this.parseEntities(item));
                this.records = this.parseRecords(formattedData);
                console.log('LTS | Parsed records:', this.records);
                $(this.input).autocomplete("option", "source", this.records.map(record => ({
                    label: this.showLeft? record.left : record.right, 
                    value: record.id
                })));
            }).catch(error => { 
                console.error('LTS | API call failed:', error);
            });
        }
    }
    private parseEntities(item: any): { id: string, name: string, entity: string }{
        return {
            id: item[this.apiHelper.primaryIdAttribute],//this.apiHelper.primaryIdAttribute],
            name: item[this.apiHelper.primaryNameAttirbute],
            entity: this.apiHelper.primaryTableName
        }
    }

    private setAutoComplete(): void {
        console.log('LTS | Setting up autocomplete');
        $(this.input).autocomplete({
            source: [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            select: (event: Event, ui: any) => {
                if (ui.item) {
                    console.log('LTS | Autocomplete item selected:', ui.item);
                    this.setValue(ui.item.value);
                }
            }
        });
    }

    // Parse records to get an array of objects with required properties
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

    // Set the selected value to the lookup field
    private setValue(selectedId: string): void {
        console.log('LTS | Setting value for selected ID:', selectedId);
        const foundRecord = this.records.find(record => record.id === selectedId);
        if (foundRecord) {
            console.log('LTS | Found record:', foundRecord);
            this.contentSeparatorValue = [{
                id: foundRecord.id,
                name: foundRecord.fullName,
                entityType: foundRecord.entity
            }];
            console.log('LTS | Assigned contentSeparatorValue:', this.contentSeparatorValue);
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
        this.loadData();
        this.setFormLoadValue();
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
