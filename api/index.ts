// Aggregator entrypoint for Azure Functions (code-first programming model)
// Import each module so its app.http registrations run at startup.
import './trips'
import './trip/getBySlug'
import './participants/create'
import './participants/delete'
import './expenses/create'
import './expenses/update'
import './expenses/delete'
import './importSpreadsheet'

// No exports needed; side-effect imports register functions.