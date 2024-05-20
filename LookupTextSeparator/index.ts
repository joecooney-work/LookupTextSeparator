import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/autocomplete';//is this right?
import { ApiHelper } from './ApiHelper';


export class LookupTextSeparator implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    //#region Vars
    // Context Logic
    private container: HTMLDivElement;
    private context: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged: () => void; // to notify form of control change...
    private state: ComponentFramework.Dictionary;

    // Global Vars
    private subcontainer: HTMLDivElement;
    private apiHelper: ApiHelper;

    // Field
    private fieldentity: string;
    private fieldid: string;
    private fieldvalue: string;

    // Label
    private label: HTMLLabelElement;
    private lbl_message: string;
    private showLabel: boolean;
    private labeltext: string;

    // Input
    private input: HTMLInputElement;
    private inpt_message: string;
    private showLeft: boolean;

    // Manifest
    private contentSeparatorValue: ComponentFramework.LookupValue[] | undefined;
    private separator: string;
    private editMode: boolean;
    private searchlength: number;
    private resultslength: number;

    // Records
    private records: { left: string, right: string }[];

    //#endregion

    //#region Empty Constructor
    /**
     * Empty constructor.
     */
    constructor() {
        this.records = [];
    }
    //#endregion

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        //#region - control initialization code 
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.state = state;
        this.container = container;
        //#endregion 
        
        // Get the root URL of the CE instance
        const ceInstanceUrl = (context as any).page.getClientUrl() || "https://org1ff1f21c.crm.dynamics.com/";

        // Initialize ApiHelper with the dynamic URL
        this.apiHelper = new ApiHelper(ceInstanceUrl);

        this.loadData();
        this.loadForm();
    }

    // Load manifest data values
    private loadData(): void {
        //controls
        this.showLeft = this.context.parameters.LeftContent.raw;
        this.editMode = this.context.parameters.EditMode.raw;
        //separator
        this.separator = this.context.parameters.Separator.raw || ",";
        this.contentSeparatorValue = this.context.parameters.LookupTextSeparatorValue.raw;
        
        //field
        this.fieldentity = this.contentSeparatorValue[0].entityType || "";
        this.fieldid = this.contentSeparatorValue[0].id || "";
        this.fieldvalue = this.contentSeparatorValue[0].name || "";
        //ui
        this.labeltext = this.context.parameters.LabelValue.raw || "";
        this.showLabel = this.context.parameters.LabelDisplay.raw || false;
    }

    // Load HTML control values and set input HTML to the string
    private loadForm(): void {
        this.createContainer();
        this.createLabel();
        this.createInput();
        this.setAutoComplete();
        this.setFormLoadValue();
    }

    private createContainer(): void {
        this.subcontainer = this.getElement("div", "mycontainer", "mycontainer") as HTMLDivElement;
        this.container.appendChild(this.subcontainer);
    }

    private createLabel(): void {
        try {
            this.label = this.getElement("label", "label", "mylabel") as HTMLLabelElement;
            const message = this.showLeft ? this.labeltext.split(this.separator)[0] : this.labeltext.split(this.separator)[1];
            this.label.innerText = "(" + message.trim() + ")";
            if (this.showLabel) {
                this.container.appendChild(this.label);
            }
        } catch (error) {
            alert(error);
        }
    }

    private createInput(): void {
        this.input = this.getElement("input", "Input", "myinput") as HTMLInputElement;
        this.input.disabled = !this.editMode;
        this.container.appendChild(this.input);
    }

    private setAutoComplete(): void {
        const _searchlength = this.searchlength;
        $(this.input).autocomplete({
            source: (request: { term: string }, response: (results: string[]) => void) => {
                if (request.term.length < _searchlength) return;
                this.apiHelper.fetchRecords(request.term).then(data => {
                    const parsedRecords = this.parseRecords(data);
                    this.records = parsedRecords; // Store records
                    this.updateAutocomplete(parsedRecords, request.term, response);
                });
            },
            select: (event: Event, ui: any) => {//any? its the only thing that worked
                if (ui.item) {
                    this.setValue(ui.item.value);
                }
            }
        } as JQueryUI.AutocompleteOptions);//check this
    }

    // Parse records
    private parseRecords(records: { name: string }[]): { left: string, right: string }[] {
        return records.map(record => {
            const [left, right] = record.name.split(this.separator);
            return { left, right };
        });
    }

    // Update autocomplete with fetched records
    private updateAutocomplete(records: { left: string, right: string }[], term: string, response: (results: string[]) => void): void {
        const displayRecords = this.showLeft ? records.map(r => r.left) : records.map(r => r.right);
        const filteredRecords = $.ui.autocomplete.filter(displayRecords, term);
        response(filteredRecords);
    }

    // Set the selected value to the lookup field
    private setValue(selectedValue: string): void {
        const foundRecord = this.records.find(record =>
            this.showLeft ? record.left === selectedValue : record.right === selectedValue
        );
        if (foundRecord) {
            this.contentSeparatorValue?.push({
                id: "00000000-0000-0000-0000-000000000000", // replace with actual id if available
                name: `${foundRecord.left}${this.separator}${foundRecord.right}`,
                entityType: this.fieldentity
            });
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
        try {
            const content = this.fieldvalue.split(this.separator);
            if (content.length < 2) return;
            this.input.value = this.showLeft ? content[0].trim() : content[1].trim();
        } catch (error) {
            alert("Please contact support, the following error occurred: ERROR:" + error);
        }
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        this.loadData();
        this.setFormLoadValue();
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {
            LookupTextSeparatorValue: this.contentSeparatorValue
        };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
