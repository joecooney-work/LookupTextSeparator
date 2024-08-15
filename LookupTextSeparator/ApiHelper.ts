import { IInputs } from "./generated/ManifestTypes";//outputs not needed here..
//import * as $ from 'jquery'; not needed atm
import 'jquery-ui/ui/widgets/autocomplete';


// Helper Class
// 05.09.2024
// Joe Cooney
export class ApiHelper {
    private url: string;
    private _context: ComponentFramework.Context<IInputs>;
    public primaryNameAttirbute: string;
    private entityName: string;
    constructor(context: ComponentFramework.Context<IInputs>, tableName: string) {
        this.url = window.location.href ? window.location.href.split("?")[0] : "";
        this._context = context;
        this.entityName = tableName;
        if(this.url == "" || this.entityName == "") 
            this.alertMissingURL();
    }

    public async getRecordsByAttribute(entityName: string, attributeName: string, value: string): Promise<ComponentFramework.WebApi.RetrieveMultipleResponse> {
        try {
            const query = `?$select=name,${attributeName}&$filter=${attributeName} eq '${value}'`;
            const records = await this._context.webAPI.retrieveMultipleRecords(entityName, query);
            return records;
        } catch (error) {
            console.error("Error retrieving records: ", error);
            throw error;
        }
    }
    public getTableMetadata(): void {
        const filter = `LogicalName eq '${this.entityName}'`;
        this._context.webAPI.retrieveMultipleRecords("EntityDefinitions", `?$filter=${filter}&$select=PrimaryNameAttribute`).then(
            (response) => {
                if (response.entities.length > 0) {
                    const primaryNameAttribute = response.entities[0].PrimaryNameAttribute;
                    console.log("Primary Name Attribute:", primaryNameAttribute);
                    this.primaryNameAttirbute = response.entities[0].PrimaryNameAttribute;
                    // You can return this value or use it as needed
                }
            },
            (error) => {
                console.error("Error retrieving EntityDefinitions:", error);
            }
        );
    }
    private alertMissingURL(){
        alert("Error: Unable to locate window URL or no Table Name was set, please refresh the browser. If the problem persists contact support.");
    }
}