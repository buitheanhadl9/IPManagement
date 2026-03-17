using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace IPManagement.API.Swagger
{
    public class IFormFileParameterFilter : IParameterFilter
    {
        public void Apply(OpenApiParameter parameter, ParameterFilterContext context)
        {
            // Loại bỏ các tham số có kiểu IFormFile khỏi Swagger documentation
            var parameterInfo = context.ParameterInfo;
            if (parameterInfo != null && parameterInfo.ParameterType == typeof(IFormFile))
            {
                // Đánh dấu để loại bỏ tham số này
                parameter.Extensions.Add("x-internal", new OpenApiString("true"));
            }
        }
    }

    public class IFormFileOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            // Tìm các tham số có kiểu IFormFile
            var fileParameters = context.MethodInfo.GetParameters()
                .Where(p => p.ParameterType == typeof(IFormFile))
                .ToList();

            if (fileParameters.Count > 0)
            {
                // Thêm content type multipart/form-data
                operation.RequestBody = new OpenApiRequestBody
                {
                    Content =
                    {
                        ["multipart/form-data"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Type = "object",
                                Properties = fileParameters.ToDictionary(
                                    p => p.Name!,
                                    p => new OpenApiSchema
                                    {
                                        Type = "string",
                                        Format = "binary"
                                    }),
                                Required = new HashSet<string>(fileParameters.Select(p => p.Name!))
                            }
                        }
                    }
                };

                // Lọc bỏ các tham số IFormFile khỏi parameters
                if (operation.Parameters != null)
                {
                    operation.Parameters = operation.Parameters
                        .Where(p => !fileParameters.Any(fp => fp.Name == p.Name))
                        .ToList();
                }
            }
        }
    }
}