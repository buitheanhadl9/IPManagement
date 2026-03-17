using IPManagement.API.DTOs;
using IPManagement.API.Services;
using IPManagement.API.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DrawingsController : ControllerBase
    {
        private readonly IDrawingService _drawingService;

        public DrawingsController(IDrawingService drawingService)
        {
            _drawingService = drawingService;
        }

        [HttpGet]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.VIEW)]
        public async Task<ActionResult<DrawingDto[]>> GetAllDrawings()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _drawingService.GetAllDrawingsAsync(userId);
            return Ok(result);
        }

        [HttpGet("unit/{unitId}")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.VIEW)]
        public async Task<ActionResult<DrawingDto[]>> GetDrawingsByUnit(long unitId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _drawingService.GetDrawingsByUnitAsync(userId, unitId);
            return Ok(result);
        }

        [HttpGet("{drawingId}")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.VIEW)]
        public async Task<ActionResult<DrawingDto>> GetDrawing(long drawingId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _drawingService.GetDrawingByIdAsync(userId, drawingId);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost("upload")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.CREATE)]
        public async Task<ActionResult<DrawingDto>> UploadDrawing(
            long unitId,
            IFormFile file,
            string? version,
            string? description)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            
            // Validate parameters
            if (unitId <= 0)
                return BadRequest(new { message = $"Invalid unitId: {unitId}" });
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided" });
            
            Console.WriteLine($"UploadDrawing called: unitId={unitId}, file={file?.FileName}, version={version}, description={description}");
            
            // Create request object from parameters
            var request = new DrawingUploadRequest
            {
                UnitId = unitId,
                Version = version,
                Description = description
            };
            
            try
            {
                var result = await _drawingService.UploadDrawingAsync(userId, request, file);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to upload drawings" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{drawingId}")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.UPDATE)]
        public async Task<ActionResult<DrawingDto>> UpdateDrawing(long drawingId, [FromBody] DrawingUpdateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _drawingService.UpdateDrawingAsync(userId, drawingId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to update drawings" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{drawingId}/file")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.UPDATE)]
        public async Task<ActionResult<DrawingDto>> UpdateDrawingFile(long drawingId, IFormFile file, string? version)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _drawingService.UpdateDrawingFileAsync(userId, drawingId, file, version);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to update drawings" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{drawingId}")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.DELETE)]
        public async Task<ActionResult> DeleteDrawing(long drawingId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _drawingService.DeleteDrawingAsync(userId, drawingId);
                return Ok(new { message = "Drawing deleted successfully" });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to delete drawings" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{drawingId}/download")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.VIEW)]
        public async Task<ActionResult> DownloadDrawing(long drawingId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _drawingService.DownloadDrawingAsync(userId, drawingId);
                return result;
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to download drawings" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (FileNotFoundException)
            {
                return NotFound(new { message = "File not found" });
            }
        }

        [HttpGet("{drawingId}/preview")]
        [RequirePermission(FunctionCode.DRAWING, CommandCode.VIEW)]
        public async Task<ActionResult> PreviewDrawing(long drawingId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _drawingService.PreviewDrawingAsync(userId, drawingId);
                return result;
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to preview drawings" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (FileNotFoundException)
            {
                return NotFound(new { message = "File not found" });
            }
        }
    }
}