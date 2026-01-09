"""
Streamlit Dashboard for AI Prompt CI/CD System

This app provides a user-friendly interface to:
- Create and manage prompts
- View prompt versions and differences
- Run evaluations on prompts
- Generate and test improved prompt versions
- Understand why prompts were promoted or rejected

The backend is a FastAPI service that handles all the AI logic.
This frontend just provides a clean UI to interact with it.
"""

import streamlit as st
import httpx
import json
from datetime import datetime
from typing import Optional, Dict, Any, List

# ============================================================================
# Configuration
# ============================================================================

# Backend API URL - change this if your backend runs on a different port
BACKEND_URL = "http://localhost:8000"

# Task types available for prompts
TASK_TYPES = ["summarization", "extraction", "classification"]

# ============================================================================
# Helper Functions for API Calls
# ============================================================================

def api_get(endpoint: str) -> Optional[Dict[str, Any]]:
    """
    Make a GET request to the backend API.
    
    Returns the JSON response if successful, None if there's an error.
    Shows error messages in the UI using st.error().
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(f"{BACKEND_URL}{endpoint}")
            if response.status_code == 200:
                return response.json()
            else:
                error_msg = response.json().get("detail", "Unknown error")
                st.error(f"API Error: {error_msg}")
                return None
    except httpx.RequestError as e:
        st.error(f"Failed to connect to backend: {str(e)}")
        st.info(f"Make sure the backend is running at {BACKEND_URL}")
        return None
    except Exception as e:
        st.error(f"Unexpected error: {str(e)}")
        return None


def api_post(endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Make a POST request to the backend API.
    
    Returns the JSON response if successful, None if there's an error.
    Shows error messages in the UI using st.error().
    """
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(f"{BACKEND_URL}{endpoint}", json=data)
            if response.status_code in [200, 201]:
                return response.json()
            else:
                error_msg = response.json().get("detail", "Unknown error")
                st.error(f"API Error: {error_msg}")
                return None
    except httpx.RequestError as e:
        st.error(f"Failed to connect to backend: {str(e)}")
        st.info(f"Make sure the backend is running at {BACKEND_URL}")
        return None
    except Exception as e:
        st.error(f"Unexpected error: {str(e)}")
        return None


# ============================================================================
# Page Configuration
# ============================================================================

st.set_page_config(
    page_title="Prompt CI/CD Dashboard",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# Initialize Session State
# ============================================================================

# Session state stores data that persists across user interactions
if "selected_prompt" not in st.session_state:
    st.session_state.selected_prompt = None
if "selected_version" not in st.session_state:
    st.session_state.selected_version = None
if "evaluation_results" not in st.session_state:
    st.session_state.evaluation_results = None
if "page" not in st.session_state:
    st.session_state.page = None

# ============================================================================
# Sidebar Navigation
# ============================================================================

st.sidebar.title("Prompt CI/CD")
st.sidebar.markdown("---")

# Navigation menu - handle page switching
nav_options = ["Prompt Management", "Prompt Versions", "Evaluation Runner", "Self-Improvement", "Explainability"]

# Check if a page switch was requested
requested_page = st.session_state.get('page')
if requested_page and requested_page in nav_options:
    requested_index = nav_options.index(requested_page)
    # Clear the request after using it
    st.session_state.page = None
    page = st.sidebar.radio("Navigate", nav_options, index=requested_index)
else:
    page = st.sidebar.radio("Navigate", nav_options, index=0)

# Backend connection status
st.sidebar.markdown("---")
st.sidebar.subheader("Backend Status")
try:
    health = api_get("/health")
    if health:
        st.sidebar.success("Connected")
    else:
        st.sidebar.error("Disconnected")
except:
    st.sidebar.error("Disconnected")

# ============================================================================
# Page 1: Prompt Management
# ============================================================================

if page == "Prompt Management":
    st.title("Prompt Management")
    st.markdown("Create and manage your AI prompts. Think of prompts like recipes - you can create different versions and see which one works best.")
    
    # Create two columns: left for form, right for list
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Create New Prompt")
        st.markdown("---")
        
        with st.form("create_prompt_form"):
            # Prompt name input
            prompt_name = st.text_input(
                "What would you like to call this prompt?",
                help="Give it a simple name like 'email_classifier' or 'summarizer'",
                placeholder="email_classifier"
            )
            
            # Prompt text input (multiline)
            prompt_text = st.text_area(
                "What should the AI do?",
                height=200,
                help="Write the instructions you want to give to the AI. This is like writing a recipe for the AI to follow.",
                placeholder="You are a helpful assistant. Classify the following email as positive, negative, or neutral..."
            )
            
            # Task type dropdown
            task_type = st.selectbox(
                "What type of task is this?",
                options=TASK_TYPES,
                help="Choose the type of work this prompt will do"
            )
            
            # Version input
            version = st.text_input(
                "Version Number",
                value="1.0.0",
                help="This is like a version number for your prompt. Start with 1.0.0"
            )
            
            # Submit button
            submitted = st.form_submit_button("Create Prompt", type="primary")
            
            if submitted:
                if not prompt_name or not prompt_text:
                    st.error("Please fill in both prompt name and prompt text")
                else:
                    # Prepare the data to send to the backend
                    prompt_data = {
                        "name": prompt_name,
                        "version": version,
                        "template_text": prompt_text,
                        "metadata": {
                            "task": task_type
                        },
                        "status": "draft"  # New prompts start as drafts
                    }
                    
                    # Show a loading spinner while creating
                    with st.spinner("Creating prompt..."):
                        result = api_post("/prompts", prompt_data)
                    
                    if result:
                        st.success(f"Prompt '{prompt_name}' created successfully!")
                        st.balloons()  # Celebration animation
                        # Clear the form by rerunning (Streamlit will reset form inputs)
                        st.rerun()
    
    with col2:
        st.subheader("All Prompts")
        st.markdown("---")
        
        # Fetch and display all prompts
        with st.spinner("Loading prompts..."):
            prompts = api_get("/prompts")
        
        if prompts:
            if len(prompts) == 0:
                st.info("No prompts yet. Create one using the form on the left!")
            else:
                # Display prompts in a table-like format
                for prompt in prompts:
                    with st.container():
                        # Create a card-like display for each prompt
                        col_name, col_status = st.columns([3, 1])
                        
                        with col_name:
                            # Show prompt name and version
                            st.markdown(f"**{prompt['name']}** (v{prompt['version']})")
                            st.caption(f"ID: {prompt['id']}")
                        
                        with col_status:
                            # Show status with color coding
                            status = prompt.get('status', 'draft')
                            if status == 'active':
                                st.success("Active")
                            elif status == 'draft':
                                st.info("Draft")
                            else:
                                st.warning("Archived")
                        
                        # Show metadata if available
                        metadata = prompt.get('metadata', {})
                        if metadata:
                            task = metadata.get('task', 'N/A')
                            st.caption(f"Task: {task}")
                        
                        # Show a preview of the prompt text (first 100 chars)
                        preview = prompt['template_text'][:100]
                        if len(prompt['template_text']) > 100:
                            preview += "..."
                        st.text(preview)
                        
                        # Show schema info
                        if prompt.get('input_schema') or prompt.get('output_schema'):
                            schema_info = []
                            if prompt.get('input_schema'):
                                schema_info.append("Input Schema")
                            if prompt.get('output_schema'):
                                schema_info.append("Output Schema")
                            st.caption(f"Schemas: {', '.join(schema_info)}")
                        
                        # Button to select this prompt for viewing versions
                        if st.button(f"View Versions", key=f"view_{prompt['id']}"):
                            st.session_state.selected_prompt = prompt['name']
                            st.session_state.selected_version = None
                            st.session_state.page = "Prompt Versions"
                            st.success(f"Selected '{prompt['name']}'. Switching to Versions page...")
                            st.rerun()
                        
                        st.markdown("---")
        else:
            st.warning("Could not load prompts. Check backend connection.")

# ============================================================================
# Page 2: Prompt Version View
# ============================================================================

elif page == "Prompt Versions":
    st.title("Prompt Versions")
    st.markdown("See all versions of your prompt and compare what changed between them. This is like looking at the history of changes you made.")
    
    # Auto-select prompt if coming from Prompt Management
    default_prompt = st.session_state.get('selected_prompt')
    if default_prompt:
        st.info(f"Showing versions for: **{default_prompt}**")
        # Don't clear it yet - we'll use it for the selectbox
    
    # Get list of prompts for selection
    prompts = api_get("/prompts")
    
    if not prompts:
        st.warning("No prompts available. Create one first!")
    else:
        # Prompt selector dropdown
        prompt_names = [p['name'] for p in prompts]
        default_index = 0
        if default_prompt and default_prompt in prompt_names:
            default_index = prompt_names.index(default_prompt)
            # Clear it after using
            st.session_state.selected_prompt = None
        
        selected_prompt_name = st.selectbox(
            "Which prompt do you want to see?",
            options=prompt_names,
            index=default_index if prompt_names else None,
            help="Choose a prompt to see its version history"
        )
        
        if selected_prompt_name:
            # Fetch all versions of the selected prompt
            with st.spinner("Loading versions..."):
                versions = api_get(f"/prompts/{selected_prompt_name}/versions")
            
            if versions:
                st.subheader(f"Versions of '{selected_prompt_name}'")
                
                # Display versions in a table
                if len(versions) > 0:
                    # Display versions in a table format with lineage info
                    # Prepare data for table display
                    table_data = []
                    for v in versions:
                        created = v['created_at'][:10] if v.get('created_at') else "N/A"
                        parent_id = v.get('parent_version_id')
                        lineage = "Root" if not parent_id else f"Parent: {parent_id}"
                        table_data.append({
                            "Version": v['version'],
                            "Status": v['status'],
                            "Created": created,
                            "Lineage": lineage,
                            "ID": v['id']
                        })
                    
                    # Display as a table (Streamlit's st.table works with list of dicts)
                    st.table(table_data)
                    
                    # Show version details in expandable sections
                    st.markdown("---")
                    st.subheader("Version Details")
                    for v in versions:
                        with st.expander(f"Version {v['version']} - {v['status']}"):
                            full_prompt = api_get(f"/prompts/{selected_prompt_name}?version={v['version']}")
                            if full_prompt:
                                col1, col2 = st.columns(2)
                                with col1:
                                    st.markdown("**Template:**")
                                    st.code(full_prompt['template_text'], language='text')
                                with col2:
                                    if full_prompt.get('input_schema'):
                                        st.markdown("**Input Schema:**")
                                        st.json(full_prompt['input_schema'])
                                    if full_prompt.get('output_schema'):
                                        st.markdown("**Output Schema:**")
                                        st.json(full_prompt['output_schema'])
                                    if full_prompt.get('metadata'):
                                        st.markdown("**Metadata:**")
                                        st.json(full_prompt['metadata'])
                                if v.get('parent_version_id'):
                                    st.caption(f"Parent Version ID: {v['parent_version_id']}")
                    
                    # Version comparison section
                    st.markdown("---")
                    st.subheader("Compare Versions")
                    
                    col_a, col_b = st.columns(2)
                    
                    with col_a:
                        version_a_id = st.selectbox(
                            "Version A",
                            options=[v['id'] for v in versions],
                            format_func=lambda x: f"v{[v['version'] for v in versions if v['id'] == x][0]}",
                            help="Select the first version to compare"
                        )
                    
                    with col_b:
                        version_b_id = st.selectbox(
                            "Version B",
                            options=[v['id'] for v in versions],
                            format_func=lambda x: f"v{[v['version'] for v in versions if v['id'] == x][0]}",
                            help="Select the second version to compare"
                        )
                    
                    if st.button("Show Diff", type="primary"):
                        if version_a_id == version_b_id:
                            st.warning("Please select two different versions to compare")
                        else:
                            with st.spinner("Computing diff..."):
                                diff = api_get(f"/prompts/diffs/{version_a_id}/{version_b_id}")
                            
                            if diff:
                                st.markdown("### Changes Summary")
                                st.info(diff.get('changes_summary', 'No summary available'))
                                
                                st.markdown("### Detailed Diff")
                                # Display diff in a code block for better readability
                                st.code(diff.get('diff_text', ''), language='diff')
                                
                                # Show added and removed lines separately
                                if diff.get('added_lines'):
                                    st.markdown("#### Added Lines")
                                    for line in diff['added_lines']:
                                        st.success(f"+ {line}")
                                
                                if diff.get('removed_lines'):
                                    st.markdown("#### Removed Lines")
                                    for line in diff['removed_lines']:
                                        st.error(f"- {line}")
                else:
                    st.info("No versions found for this prompt")
            else:
                st.warning("Could not load versions for this prompt")
        else:
            st.info("Please select a prompt to view its versions")

# ============================================================================
# Page 3: Evaluation Runner
# ============================================================================

elif page == "Evaluation Runner":
    st.title("Test Your Prompts")
    st.markdown("Test your prompts to see how well they work. You'll provide some examples and the system will check if the AI gives the right answers.")
    
    # Get list of prompts
    prompts = api_get("/prompts")
    
    if not prompts:
        st.warning("No prompts available. Create one first!")
    else:
        prompt_names = [p['name'] for p in prompts]
        selected_prompt_name = st.selectbox(
            "Which prompt do you want to test?",
            options=prompt_names,
            help="Choose a prompt to test"
        )
        
        if selected_prompt_name:
            # Get versions for the selected prompt
            versions = api_get(f"/prompts/{selected_prompt_name}/versions")
            
            if versions:
                version_options = [f"{v['version']} ({v['status']})" for v in versions]
                selected_version_display = st.selectbox(
                    "Select Version",
                    options=version_options,
                    help="Choose which version to evaluate"
                )
                
                # Extract version string from selection
                selected_version = selected_version_display.split(" ")[0]
                
                st.markdown("---")
                st.subheader("Evaluation Settings")
                
                # Explain evaluation pipeline
                with st.expander("How does testing work?", expanded=False):
                    st.markdown("""
                    **How We Test Your Prompts:**
                    
                    We check your prompts in two ways:
                    
                    1. **Format Check** (automatic):
                       - Makes sure the AI's answer is in the right format
                       - Checks if required information is included
                       - This is fast and automatic
                    
                    2. **Quality Check** (using AI):
                       - Another AI checks if the answer is correct
                       - Checks if the answer is the right length
                       - Makes sure the answer is safe and makes sense
                       - The checking AI doesn't know which prompt was used (fair testing)
                    
                    **What We Check:**
                    - **Correctness**: Is the answer right?
                    - **Format**: Is it in the right format?
                    - **Verbosity**: Is it the right length?
                    - **Safety**: Is it safe?
                    - **Consistency**: Does it make sense?
                    """)
                
                # Simple test dataset input
                # User-friendly input form
                num_examples = st.number_input(
                    "How many examples do you want to add? (Optional - leave at 0 to use default)",
                    min_value=0,
                    max_value=20,
                    value=0,
                    help="Add between 0 and 20 examples. Leave at 0 to use a default test case."
                )
                
                dataset_entries = []
                if num_examples > 0:
                    for i in range(num_examples):
                        st.markdown(f"**Example {i+1}**")
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            input_text = st.text_input(
                                f"Input for example {i+1}",
                                key=f"input_{i}",
                                help="What you want to give to the AI"
                            )
                        
                        with col2:
                            expected_text = st.text_input(
                                f"Expected output for example {i+1} (optional)",
                                key=f"expected_{i}",
                                help="What you expect the AI to respond with"
                            )
                        
                        if input_text:
                            entry = {"input_data": {"text": input_text}}
                            if expected_text:
                                entry["expected_output"] = {"output": expected_text}
                            dataset_entries.append(entry)
                
                # Show info if no examples provided
                if not dataset_entries:
                    st.info("💡 No examples provided. The system will create a default test case based on your prompt's structure.")
                
                # Evaluation dimensions selector (before the button)
                st.markdown("#### What Should We Check?")
                eval_dimensions = st.multiselect(
                    "What aspects should we evaluate?",
                    options=["correctness", "format", "verbosity", "safety", "consistency"],
                    default=["correctness", "format"],
                    help="Choose what to check: Correctness (is it right?), Format (is it in the right format?), Verbosity (is it the right length?), Safety (is it safe?), Consistency (is it consistent?)"
                )
                
                if not eval_dimensions:
                    st.warning("Please select at least one evaluation dimension")
                    st.stop()
                
                if st.button("Run Test", type="primary"):
                    try:
                        # Prepare evaluation request
                        # Only include dataset_entries if we have any
                        eval_request = {
                            "version": selected_version,
                            "evaluation_dimensions": eval_dimensions
                        }
                        # Only add dataset_entries if we have any (backend will create default if empty)
                        if dataset_entries:
                            eval_request["dataset_entries"] = dataset_entries
                        
                        # Show progress
                        progress_bar = st.progress(0)
                        status_text = st.empty()
                        
                        status_text.text("Starting evaluation...")
                        progress_bar.progress(10)
                        
                        # Run evaluation
                        with st.spinner("Running evaluation (this may take a minute)..."):
                            result = api_post(
                                f"/evaluations/prompts/{selected_prompt_name}/evaluate",
                                eval_request
                            )
                        
                        progress_bar.progress(100)
                        status_text.text("Evaluation complete!")
                        
                        if not result:
                            st.error("Evaluation failed. Please check the error messages above and try again.")
                            st.stop()
                        
                        if result:
                            st.session_state.evaluation_results = result
                            st.success("Evaluation completed!")
                            
                            # Check if we have results
                            results_list = result.get('results', [])
                            if not results_list:
                                st.warning("⚠️ Evaluation completed but no detailed results were returned. This might indicate an issue with the evaluation process.")
                                st.info("**Summary:** The evaluation ran, but individual result details are not available. Check the backend logs for more information.")
                                
                                # Show what we do have
                                st.markdown("---")
                                st.subheader("Available Information")
                                col1, col2 = st.columns(2)
                                with col1:
                                    st.metric("Total Examples", result.get('total_examples', 0))
                                    st.metric("Passed", result.get('passed_examples', 0))
                                with col2:
                                    st.metric("Failed", result.get('failed_examples', 0))
                                    overall = result.get('overall_score')
                                    if overall is not None:
                                        st.metric("Overall Score", f"{overall:.2%}")
                                    else:
                                        st.metric("Overall Score", "Not calculated")
                                
                                st.stop()
                            
                            # Display results
                            st.markdown("---")
                            st.subheader("Evaluation Results")
                            
                            # Aggregate metrics
                            col1, col2, col3, col4 = st.columns(4)
                            
                            with col1:
                                overall = result.get('overall_score')
                                if overall is not None:
                                    st.metric("Overall Score", f"{overall:.2%}")
                                else:
                                    st.metric("Overall Score", "Not calculated")
                            
                            with col2:
                                passed = result.get('passed_examples', 0)
                                total = result.get('total_examples', 0)
                                if total > 0:
                                    pass_rate_pct = (passed / total) * 100
                                    st.metric("Pass Rate", f"{passed}/{total}", 
                                            help=f"That's {pass_rate_pct:.0f}% passing")
                                else:
                                    st.metric("Pass Rate", "0/0")
                            
                            with col3:
                                failed = result.get('failed_examples', 0)
                                st.metric("Failed", failed)
                            
                            with col4:
                                format_rate = result.get('format_pass_rate')
                                if format_rate is not None:
                                    st.metric("Format Pass Rate", f"{format_rate:.2%}")
                                else:
                                    # Try to calculate from results if available
                                    results_list = result.get('results', [])
                                    if results_list:
                                        format_passed = sum(1 for r in results_list 
                                                          if (r.get('passed_format_validation') if isinstance(r, dict) 
                                                              else getattr(r, 'passed_format_validation', False)))
                                        calc_rate = format_passed / len(results_list) if results_list else 0
                                        st.metric("Format Pass Rate", f"{calc_rate:.2%}")
                                    else:
                                        st.metric("Format Pass Rate", "Not available")
                            
                            # Detailed scores
                            st.markdown("#### How Did It Do On Each Check?")
                            score_cols = st.columns(5)
                            scores = {
                                "Correctness": result.get('correctness_score'),
                                "Format": result.get('format_score'),
                                "Verbosity": result.get('verbosity_score'),
                                "Safety": result.get('safety_score'),
                                "Consistency": result.get('consistency_score')
                            }
                            
                            score_labels = {
                                "Correctness": "Is it right?",
                                "Format": "Right format?",
                                "Verbosity": "Right length?",
                                "Safety": "Is it safe?",
                                "Consistency": "Makes sense?"
                            }
                            
                            for i, (label, score) in enumerate(scores.items()):
                                with score_cols[i]:
                                    if score is not None:
                                        # Show score even if 0 (it's a valid score)
                                        st.metric(score_labels.get(label, label), f"{score:.2%}")
                                    else:
                                        st.metric(score_labels.get(label, label), "Not checked")
                            
                            # Per-case breakdown
                            st.markdown("---")
                            st.subheader("Results for Each Example")
                            
                            # Show all results in a table
                            results_list = result.get('results', [])
                            if results_list:
                                results_data = []
                                for idx, r in enumerate(results_list, 1):
                                    # Handle both dict and object responses
                                    if isinstance(r, dict):
                                        passed = r.get('passed', False)
                                        overall = r.get('overall_score')
                                        correctness = r.get('correctness_score')
                                        format_score = r.get('format_score')
                                        format_valid = r.get('passed_format_validation', False)
                                    else:
                                        passed = getattr(r, 'passed', False)
                                        overall = getattr(r, 'overall_score', None)
                                        correctness = getattr(r, 'correctness_score', None)
                                        format_score = getattr(r, 'format_score', None)
                                        format_valid = getattr(r, 'passed_format_validation', False)
                                    
                                    results_data.append({
                                        "Example": f"#{idx}",
                                        "Passed?": "Yes" if passed else "No",
                                        "Overall Score": f"{overall:.2%}" if overall is not None else "Not calculated",
                                        "Correct?": f"{correctness:.2%}" if correctness is not None else "Not checked",
                                        "Right Format?": f"{format_score:.2%}" if format_score is not None else "Not checked",
                                        "Format OK": "Yes" if format_valid else "No"
                                    })
                                st.dataframe(results_data, use_container_width=True, hide_index=True)
                            else:
                                st.info("No detailed results available. The evaluation may still be processing.")
                            
                            # Failure cases
                            failed_count = result.get('failed_examples', 0)
                            results_list = result.get('results', [])
                            
                            if failed_count > 0:
                                st.markdown("---")
                                st.subheader("What Went Wrong?")
                                
                                if results_list and len(results_list) > 0:
                                    # Get failed results - handle both dict and object
                                    failed_results = []
                                    for r in results_list:
                                        if isinstance(r, dict):
                                            passed = r.get('passed', True)
                                        else:
                                            passed = getattr(r, 'passed', True)
                                        
                                        if not passed:
                                            failed_results.append(r)
                                    
                                    if failed_results:
                                        st.info(f"Found {len(failed_results)} example(s) that didn't pass. Details below:")
                                        
                                        for i, failure in enumerate(failed_results[:5]):  # Show first 5 failures
                                            # Handle both dict and object
                                            if isinstance(failure, dict):
                                                input_data = failure.get('input_data', {})
                                                expected_output = failure.get('expected_output')
                                                actual_output = failure.get('actual_output')
                                                failure_reason = failure.get('failure_reason')
                                                judge_feedback = failure.get('judge_feedback')
                                                format_error = failure.get('format_validation_error')
                                                fail_scores = {
                                                    "Correctness": failure.get('correctness_score'),
                                                    "Format": failure.get('format_score'),
                                                    "Verbosity": failure.get('verbosity_score'),
                                                    "Safety": failure.get('safety_score'),
                                                    "Consistency": failure.get('consistency_score')
                                                }
                                            else:
                                                input_data = getattr(failure, 'input_data', {})
                                                expected_output = getattr(failure, 'expected_output', None)
                                                actual_output = getattr(failure, 'actual_output', None)
                                                failure_reason = getattr(failure, 'failure_reason', None)
                                                judge_feedback = getattr(failure, 'judge_feedback', None)
                                                format_error = getattr(failure, 'format_validation_error', None)
                                                fail_scores = {
                                                    "Correctness": getattr(failure, 'correctness_score', None),
                                                    "Format": getattr(failure, 'format_score', None),
                                                    "Verbosity": getattr(failure, 'verbosity_score', None),
                                                    "Safety": getattr(failure, 'safety_score', None),
                                                    "Consistency": getattr(failure, 'consistency_score', None)
                                                }
                                            
                                            with st.expander(f"Example #{i+1} - What went wrong"):
                                                col1, col2 = st.columns(2)
                                                
                                                with col1:
                                                    st.markdown("**Input:**")
                                                    st.json(input_data if input_data else {})
                                                    
                                                    if expected_output:
                                                        st.markdown("**Expected Output:**")
                                                        st.json(expected_output)
                                                
                                                with col2:
                                                    if actual_output:
                                                        st.markdown("**Actual Output:**")
                                                        st.json(actual_output)
                                                    else:
                                                        st.warning("No output was generated")
                                                    
                                                    # Show dimension scores for this failure
                                                    st.markdown("**Scores for this example:**")
                                                    score_labels = {
                                                        "Correctness": "Is it right?",
                                                        "Format": "Right format?",
                                                        "Verbosity": "Right length?",
                                                        "Safety": "Is it safe?",
                                                        "Consistency": "Makes sense?"
                                                    }
                                                    for dim, score in fail_scores.items():
                                                        if score is not None:
                                                            st.metric(score_labels.get(dim, dim), f"{score:.2%}")
                                                
                                                if failure_reason:
                                                    st.error(f"**Why it failed:** {failure_reason}")
                                                
                                                if judge_feedback:
                                                    st.info(f"**What the checker said:** {judge_feedback}")
                                                
                                                if format_error:
                                                    st.warning(f"**Format problem:** {format_error}")
                                    else:
                                        # Results exist but none marked as failed - show all results that might have issues
                                        st.warning(f"The evaluation shows {failed_count} failed example(s), but the detailed results don't show which ones failed. Showing all results below:")
                                        for i, r in enumerate(results_list[:failed_count], 1):
                                            if isinstance(r, dict):
                                                input_data = r.get('input_data', {})
                                                actual_output = r.get('actual_output')
                                                overall = r.get('overall_score')
                                            else:
                                                input_data = getattr(r, 'input_data', {})
                                                actual_output = getattr(r, 'actual_output', None)
                                                overall = getattr(r, 'overall_score', None)
                                            
                                            with st.expander(f"Example #{i} - Check this one"):
                                                st.json({"input": input_data, "output": actual_output, "score": overall})
                                else:
                                    # No results array but failed_count > 0
                                    st.warning(f"{failed_count} example(s) failed, but detailed results are not available. This might indicate the evaluation encountered errors. Check the backend logs for more information.")
                    except json.JSONDecodeError:
                        st.error("Invalid JSON format. Please check your dataset JSON.")
                    except Exception as e:
                        st.error(f"Error running evaluation: {str(e)}")
            else:
                st.warning("Could not load versions for this prompt")

# ============================================================================
# Page 4: Self-Improvement Simulation
# ============================================================================

elif page == "Self-Improvement":
    st.title("Improve Your Prompts Automatically")
    st.markdown("Let the system automatically create better versions of your prompts by learning from mistakes. It's like having an assistant that helps improve your prompts.")
    
    # Get list of prompts
    prompts = api_get("/prompts")
    
    if not prompts:
        st.warning("No prompts available. Create one first!")
    else:
        prompt_names = [p['name'] for p in prompts]
        selected_prompt_name = st.selectbox(
            "Which prompt do you want to improve?",
            options=prompt_names,
            help="Choose a prompt that you want to make better"
        )
        
        if selected_prompt_name:
            st.markdown("---")
            st.info("The system will test your current prompt, find what's not working, and create better versions automatically.")
            
            # Simple dataset input (same as evaluation page)
            # User-friendly input form
            num_examples = st.number_input(
                "How many examples?",
                min_value=1,
                max_value=20,
                value=2,
                help="Add between 1 and 20 examples"
            )
            
            dataset_entries = []
            for i in range(num_examples):
                st.markdown(f"**Example {i+1}**")
                col1, col2 = st.columns(2)
                
                with col1:
                    input_text = st.text_input(
                        f"Input for example {i+1}",
                        key=f"improve_input_{i}",
                        help="What you want to give to the AI"
                    )
                
                with col2:
                    expected_text = st.text_input(
                        f"Expected output for example {i+1} (optional)",
                        key=f"improve_expected_{i}",
                        help="What you expect the AI to respond with"
                    )
                
                if input_text:
                    entry = {"input_data": {"text": input_text}}
                    if expected_text:
                        entry["expected_output"] = {"output": expected_text}
                    dataset_entries.append(entry)
            
            if not dataset_entries:
                st.warning("Please add at least one example with an input.")
                st.stop()
            
            if st.button("Generate Improved Prompt", type="primary"):
                try:
                    # dataset_entries already created from form
                    
                    # Call the backend improvement service
                    with st.spinner("Analyzing current prompt and generating improvements (this may take a few minutes)..."):
                        # Prepare improvement request
                        improvement_request = {
                            "dataset_entries": dataset_entries,
                            "max_candidates": 3,
                            "improvement_threshold": 0.05  # 5% improvement required
                        }
                        
                        # Call the improvement endpoint
                        improvement_result = api_post(
                            f"/evaluations/prompts/{selected_prompt_name}/improve",
                            improvement_request
                        )
                    
                    if improvement_result:
                        st.session_state.improvement_result = improvement_result
                        
                        # Get baseline and candidate prompts for display
                        baseline_prompt = api_get(f"/prompts/{selected_prompt_name}?version={improvement_result.get('baseline_version')}")
                        
                        st.markdown("---")
                        st.subheader("Improvement Results")
                        
                        # Show baseline with failure analysis context
                        if baseline_prompt:
                            col1, col2 = st.columns([2, 1])
                            with col1:
                                st.markdown("#### Baseline Prompt")
                                st.code(baseline_prompt['template_text'], language='text')
                            with col2:
                                baseline_score = improvement_result.get('baseline_score', 0)
                                st.metric("Baseline Score", f"{baseline_score:.2%}" if baseline_score else "N/A")
                                st.caption(f"Version: {baseline_prompt['version']}")
                                st.caption(f"Status: {baseline_prompt.get('status', 'N/A')}")
                        
                        # Show failure analysis context
                        st.markdown("---")
                        st.markdown("#### Failure Analysis")
                        st.info("""
                        The system analyzed the baseline evaluation to identify failure patterns:
                        - Format validation failures
                        - Low correctness scores
                        - Edge cases that failed
                        - Common error patterns
                        
                        These failures were used to generate improved candidate prompts.
                        """)
                        
                        # Show best candidate if available
                        if improvement_result.get('best_candidate_version'):
                            best_candidate_prompt = api_get(f"/prompts/{selected_prompt_name}?version={improvement_result.get('best_candidate_version')}")
                            
                            if best_candidate_prompt:
                                st.markdown("---")
                                col1, col2 = st.columns([2, 1])
                                with col1:
                                    st.markdown("#### Best Candidate Prompt")
                                    st.code(best_candidate_prompt['template_text'], language='text')
                                with col2:
                                    candidate_score = improvement_result.get('best_candidate_score', 0)
                                    improvement_delta = improvement_result.get('improvement_delta', 0)
                                    st.metric("Candidate Score", f"{candidate_score:.2%}" if candidate_score else "N/A", 
                                            delta=f"{improvement_delta:+.2%}" if improvement_delta else None)
                                    st.caption(f"Version: {best_candidate_prompt['version']}")
                                
                                # Show improvement rationale if available
                                if best_candidate_prompt.get('metadata', {}).get('improvement_rationale'):
                                    st.markdown("#### Explanation of Changes")
                                    st.info(best_candidate_prompt['metadata']['improvement_rationale'])
                                
                                # Show addressed failures
                                if best_candidate_prompt.get('metadata', {}).get('addressed_failures'):
                                    st.markdown("#### Addressed Failures")
                                    addressed = best_candidate_prompt['metadata']['addressed_failures']
                                    if isinstance(addressed, list):
                                        for failure_type in addressed:
                                            st.success(f"- {failure_type}")
                                    else:
                                        st.text(str(addressed))
                        
                        # A/B Comparison Results
                        st.markdown("---")
                        st.subheader("A/B Evaluation Results")
                        
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            st.markdown("#### Baseline Version")
                            baseline_score = improvement_result.get('baseline_score')
                            if baseline_score is not None:
                                st.metric("Score", f"{baseline_score:.2%}")
                            else:
                                st.metric("Score", "N/A")
                            st.caption(f"Version: {improvement_result.get('baseline_version', 'N/A')}")
                        
                        with col2:
                            st.markdown("#### Best Candidate Version")
                            candidate_score = improvement_result.get('best_candidate_score')
                            improvement_delta = improvement_result.get('improvement_delta', 0)
                            if candidate_score is not None:
                                delta_display = f"{improvement_delta:+.2%}" if improvement_delta != 0 else "0%"
                                st.metric("Score", f"{candidate_score:.2%}", delta=delta_display)
                            else:
                                st.metric("Score", "N/A")
                            st.caption(f"Version: {improvement_result.get('best_candidate_version', 'N/A')}")
                        
                        # Promotion Decision
                        st.markdown("---")
                        st.subheader("Promotion Decision")
                        
                        decision = improvement_result.get('promotion_decision', 'pending')
                        reason = improvement_result.get('promotion_reason', 'No reason provided')
                        
                        if decision == 'promoted':
                            st.success(f"**PROMOTED** - {reason}")
                            st.info("The new version has been automatically activated.")
                            
                            # Show what improved
                            if improvement_result.get('best_candidate_version'):
                                st.markdown("**What Improved:**")
                                st.success(f"Score improved by {improvement_delta:.2%}")
                                
                        elif decision == 'rejected':
                            st.warning(f"**REJECTED** - {reason}")
                            st.info("The current version remains active.")
                            
                            # Show why it was rejected
                            if improvement_delta < 0:
                                st.error(f"Score decreased by {abs(improvement_delta):.2%}")
                            elif improvement_delta < 0.05:
                                st.warning(f"Improvement ({improvement_delta:.2%}) below threshold (5%)")
                        else:
                            st.info(f"**PENDING** - {reason}")
                        
                        # Show statistics
                        st.markdown("---")
                        st.markdown("#### Improvement Statistics")
                        stats_col1, stats_col2, stats_col3 = st.columns(3)
                        
                        with stats_col1:
                            st.metric("Candidates Generated", improvement_result.get('candidates_generated', 0))
                        
                        with stats_col2:
                            st.metric("Candidates Evaluated", improvement_result.get('candidates_evaluated', 0))
                        
                        with stats_col3:
                            st.metric("Improvement Delta", f"{improvement_delta:+.2%}")
                    else:
                        st.error("Failed to generate improved prompt. Check backend logs for details.")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")

# ============================================================================
# Page 5: Explainability
# ============================================================================

elif page == "Explainability":
    st.title("Why Did This Happen?")
    st.markdown("Understand why prompts were changed, what got better, and what might have gotten worse. This helps you learn what works.")
    
    # Get list of prompts
    prompts = api_get("/prompts")
    
    if not prompts:
        st.warning("No prompts available.")
    else:
        prompt_names = [p['name'] for p in prompts]
        selected_prompt_name = st.selectbox(
            "Which prompt do you want to understand?",
            options=prompt_names,
            help="Choose a prompt to see why it was changed"
        )
        
        if selected_prompt_name:
            # Get all versions
            versions = api_get(f"/prompts/{selected_prompt_name}/versions")
            
            if versions and len(versions) > 1:
                st.markdown("---")
                st.subheader("Version History")
                
                # Sort versions by creation date (newest first)
                sorted_versions = sorted(versions, key=lambda x: x.get('created_at', ''), reverse=True)
                
                # Get evaluations for all versions to compare
                all_evaluations = api_get(f"/evaluations/prompts/{selected_prompt_name}")
                eval_by_version = {}
                if all_evaluations:
                    for eval_data in all_evaluations:
                        version = eval_data.get('prompt_version')
                        if version:
                            if version not in eval_by_version:
                                eval_by_version[version] = []
                            eval_by_version[version].append(eval_data)
                
                for i, version in enumerate(sorted_versions):
                    version_num = version['version']
                    version_status = version['status']
                    created_date = version.get('created_at', 'N/A')[:10] if version.get('created_at') else 'N/A'
                    
                    # Get evaluation data for this version
                    version_eval = None
                    if version_num in eval_by_version and eval_by_version[version_num]:
                        # Get the most recent evaluation for this version
                        version_eval = sorted(eval_by_version[version_num], 
                                             key=lambda x: x.get('created_at', ''), 
                                             reverse=True)[0]
                    
                    # Get the full prompt details
                    full_prompt = api_get(f"/prompts/{selected_prompt_name}?version={version_num}")
                    
                    # Create a card-like display
                    with st.container():
                        # Header with version info
                        col_status, col_version, col_date = st.columns([1, 2, 2])
                        with col_status:
                            if version_status == 'active':
                                st.success("ACTIVE")
                            elif version_status == 'draft':
                                st.info("DRAFT")
                            else:
                                st.warning("ARCHIVED")
                        
                        with col_version:
                            st.markdown(f"### Version {version_num}")
                        
                        with col_date:
                            st.caption(f"Created: {created_date}")
                        
                        st.markdown("---")
                        
                        # Show prompt text
                        if full_prompt:
                            st.markdown("**What this version says:**")
                            st.code(full_prompt['template_text'], language='text')
                        
                        # Show metrics and explanation if this version was promoted
                        if version_status == 'active' and i > 0:
                            st.markdown("---")
                            st.markdown("### Why This Version Became Active")
                            
                            # Try to get improvement data
                            improvements = api_get(f"/evaluations/prompts/{selected_prompt_name}/improvements")
                            
                            # Find the improvement that promoted this version
                            promotion_data = None
                            if improvements:
                                for imp in improvements:
                                    if imp.get('best_candidate_version') == version_num:
                                        promotion_data = imp
                                        break
                            
                            if promotion_data:
                                decision = promotion_data.get('promotion_decision', 'unknown')
                                baseline_score = promotion_data.get('baseline_score', 0)
                                candidate_score = promotion_data.get('best_candidate_score', 0)
                                improvement_delta = promotion_data.get('improvement_delta', 0)
                                
                                # Get previous version for comparison
                                previous_version = sorted_versions[i] if i < len(sorted_versions) else None
                                prev_eval = None
                                if previous_version and previous_version['version'] in eval_by_version:
                                    prev_evals = eval_by_version[previous_version['version']]
                                    if prev_evals:
                                        prev_eval = sorted(prev_evals, key=lambda x: x.get('created_at', ''), reverse=True)[0]
                                
                                if decision == 'promoted':
                                    # Show metrics in a natural way
                                    st.success("**This version was promoted because it performed better.**")
                                    
                                    # Metrics display
                                    col1, col2, col3 = st.columns(3)
                                    with col1:
                                        st.metric("Previous Version Score", 
                                                f"{baseline_score:.1%}" if baseline_score else "Not tested",
                                                help="How well the previous version performed")
                                    with col2:
                                        st.metric("This Version Score", 
                                                f"{candidate_score:.1%}" if candidate_score else "Not tested",
                                                delta=f"{improvement_delta:+.1%}" if improvement_delta else None,
                                                help="How well this version performs")
                                    with col3:
                                        improvement_pct = (improvement_delta * 100) if improvement_delta else 0
                                        st.metric("Improvement", 
                                                f"{improvement_pct:.1f} percentage points better",
                                                help="How much better this version is")
                                    
                                    # Natural language explanation
                                    st.markdown("---")
                                    st.markdown("#### What This Means")
                                    
                                    if baseline_score and candidate_score:
                                        explanation = f"""
                                        When we tested this version against the previous one, we found that it scored **{candidate_score:.1%}** compared to the previous version's **{baseline_score:.1%}**. 
                                        That's an improvement of **{improvement_delta:.1%}**, which means this version is performing better.
                                        """
                                        
                                        if prev_eval and version_eval:
                                            # Compare dimension scores
                                            prev_correctness = prev_eval.get('correctness_score')
                                            curr_correctness = version_eval.get('correctness_score')
                                            prev_format = prev_eval.get('format_score')
                                            curr_format = version_eval.get('format_score')
                                            
                                            improvements_list = []
                                            regressions_list = []
                                            
                                            if curr_correctness and prev_correctness:
                                                if curr_correctness > prev_correctness:
                                                    improvements_list.append(f"correctness improved from {prev_correctness:.1%} to {curr_correctness:.1%}")
                                                elif curr_correctness < prev_correctness:
                                                    regressions_list.append(f"correctness decreased from {prev_correctness:.1%} to {curr_correctness:.1%}")
                                            
                                            if curr_format and prev_format:
                                                if curr_format > prev_format:
                                                    improvements_list.append(f"format compliance improved from {prev_format:.1%} to {curr_format:.1%}")
                                                elif curr_format < prev_format:
                                                    regressions_list.append(f"format compliance decreased from {prev_format:.1%} to {curr_format:.1%}")
                                            
                                            if improvements_list:
                                                explanation += "\n\n**What got better:** " + ", ".join(improvements_list) + "."
                                            
                                            if regressions_list:
                                                explanation += "\n\n**What got worse:** " + ", ".join(regressions_list) + "."
                                            elif not regressions_list:
                                                explanation += "\n\n**Good news:** Nothing got worse. All aspects either improved or stayed the same."
                                        
                                        explanation += f"\n\nBecause this improvement was significant (at least 5% better) and met all quality requirements, this version was automatically made the active version."
                                        
                                        st.info(explanation)
                                    
                                    # Show the reason from the system
                                    reason = promotion_data.get('promotion_reason', '')
                                    if reason:
                                        st.markdown("#### System's Explanation")
                                        st.text(reason)
                                
                                elif decision == 'rejected':
                                    st.warning("**This version was considered but not promoted.**")
                                    
                                    # Show why it was rejected in natural language
                                    reason = promotion_data.get('promotion_reason', 'No reason provided')
                                    
                                    explanation = f"""
                                    The system tested this version and compared it to the previous one. 
                                    """
                                    
                                    if baseline_score and candidate_score:
                                        explanation += f"The previous version scored **{baseline_score:.1%}** and this version scored **{candidate_score:.1%}**."
                                        
                                        if improvement_delta < 0:
                                            explanation += f" Unfortunately, this version performed **{abs(improvement_delta):.1%} worse**, so it was not promoted."
                                        elif improvement_delta < 0.05:
                                            explanation += f" While it did improve by **{improvement_delta:.1%}**, this wasn't enough to meet our quality standards (we require at least 5% improvement)."
                                        else:
                                            explanation += f" However, it didn't meet all the quality requirements needed for promotion."
                                    
                                    explanation += f"\n\n**Why it wasn't promoted:** {reason}"
                                    
                                    st.info(explanation)
                            
                            elif version_eval:
                                # Show evaluation metrics if available
                                st.markdown("---")
                                st.markdown("### Performance Metrics")
                                
                                overall = version_eval.get('overall_score', 0)
                                correctness = version_eval.get('correctness_score')
                                format_score = version_eval.get('format_score')
                                passed = version_eval.get('passed_examples', 0)
                                total = version_eval.get('total_examples', 0)
                                
                                col1, col2, col3 = st.columns(3)
                                with col1:
                                    st.metric("Overall Score", f"{overall:.1%}" if overall else "Not tested")
                                with col2:
                                    st.metric("Pass Rate", f"{passed} out of {total} examples passed" if total > 0 else "No tests")
                                with col3:
                                    format_rate = version_eval.get('format_pass_rate', 0)
                                    st.metric("Format Compliance", f"{format_rate:.1%}" if format_rate else "Not tested")
                                
                                # Natural language summary
                                if overall and total > 0:
                                    explanation = f"""
                                    This version was tested on **{total} examples** and scored **{overall:.1%} overall**. 
                                    It passed **{passed} out of {total} tests**, which means it got the right answer **{(passed/total)*100:.0f}% of the time**.
                                    """
                                    
                                    if format_rate:
                                        explanation += f" When it came to following the correct format, it succeeded **{format_rate:.1%} of the time**."
                                    
                                    if correctness:
                                        explanation += f" In terms of correctness (getting the right answer), it scored **{correctness:.1%}**."
                                    
                                    st.info(explanation)
                            
                            else:
                                st.info("This version is currently active. To see why it was promoted, run an improvement test on the Self-Improvement page.")
                        
                        # Show comparison with previous version if available
                        if i > 0 and version_eval:
                            previous_version = sorted_versions[i]
                            prev_version_num = previous_version['version']
                            
                            if prev_version_num in eval_by_version and eval_by_version[prev_version_num]:
                                prev_eval = sorted(eval_by_version[prev_version_num], 
                                                 key=lambda x: x.get('created_at', ''), 
                                                 reverse=True)[0]
                                
                                st.markdown("---")
                                st.markdown("### Comparison with Previous Version")
                                
                                # Compare metrics
                                curr_overall = version_eval.get('overall_score', 0)
                                prev_overall = prev_eval.get('overall_score', 0)
                                
                                if curr_overall and prev_overall:
                                    delta = curr_overall - prev_overall
                                    
                                    col1, col2, col3 = st.columns(3)
                                    with col1:
                                        st.metric(f"Version {prev_version_num} Score", f"{prev_overall:.1%}")
                                    with col2:
                                        st.metric(f"Version {version_num} Score", f"{curr_overall:.1%}", 
                                                delta=f"{delta:+.1%}")
                                    with col3:
                                        if delta > 0:
                                            st.success(f"This version is {delta:.1%} better")
                                        elif delta < 0:
                                            st.error(f"This version is {abs(delta):.1%} worse")
                                        else:
                                            st.info("No change in overall score")
                                    
                                    # Natural language comparison
                                    if delta > 0.05:
                                        comparison_text = f"""
                                        **This version is significantly better** than version {prev_version_num}. 
                                        The score improved from **{prev_overall:.1%} to {curr_overall:.1%}**, which is a **{delta:.1%} improvement**. 
                                        This is a meaningful improvement that shows the changes made to the prompt are working well.
                                        """
                                    elif delta > 0:
                                        comparison_text = f"""
                                        This version is slightly better than version {prev_version_num}, with the score improving from **{prev_overall:.1%} to {curr_overall:.1%}**. 
                                        While this is an improvement, it's relatively small.
                                        """
                                    elif delta < -0.02:
                                        comparison_text = f"""
                                        **This version performed worse** than version {prev_version_num}. 
                                        The score decreased from **{prev_overall:.1%} to {curr_overall:.1%}**, which is a **{abs(delta):.1%} decline**. 
                                        This suggests the changes may have introduced problems.
                                        """
                                    elif delta < 0:
                                        comparison_text = f"""
                                        This version is slightly worse than version {prev_version_num}, with the score decreasing from **{prev_overall:.1%} to {curr_overall:.1%}**. 
                                        The decline is small, but it's worth monitoring.
                                        """
                                    else:
                                        comparison_text = f"""
                                        This version performs about the same as version {prev_version_num}, with both scoring around **{curr_overall:.1%}**. 
                                        The changes didn't significantly impact performance.
                                        """
                                    
                                    st.info(comparison_text)
                        
                        st.markdown("---")
            else:
                st.info("This prompt only has one version. Create more versions and run improvements to see why versions were changed.")
            
            # General explanation section
            st.markdown("---")
            st.subheader("How the System Decides to Change Versions")
            
            st.markdown("""
            When you ask the system to improve a prompt, here's what happens:
            
            First, the system tests your current prompt on some examples to see how well it works. 
            It looks at what goes wrong - maybe the AI gives answers in the wrong format, or gets things wrong sometimes.
            
            Then, the system creates new versions of your prompt that try to fix these problems. 
            It might add clearer instructions, or change how it asks the AI to respond.
            
            Each new version gets tested on the same examples. The system compares how well each new version does 
            compared to your original prompt.
            
            If a new version does at least 5% better, follows the right format at least 95% of the time, 
            and doesn't make things worse, it automatically becomes the new active version. 
            Otherwise, your original prompt stays active.
            
            This way, your prompts keep getting better over time, but only when we're sure the changes actually help.
            """)

# ============================================================================
# Footer
# ============================================================================

st.sidebar.markdown("---")
st.sidebar.markdown("**About**")
st.sidebar.markdown("""
This dashboard helps you manage AI prompts like software code:
- Version control
- Testing & evaluation
- Continuous improvement
- Transparency & explainability
""")

